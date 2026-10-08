import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { getEpargneStyles, palette } from '@/src/constants/style/Style';
import { useApi } from '@/src/context/ApiContext';
import { useTheme } from '@/src/context/ThemeContext';

type Reconciliation = {
  epargne_mensuelle: number;
  affecte_mensuel: number;
  has_cashflow_epargne: boolean;
  depassement: { actif: boolean; montant: number };
  surplus: { actif: boolean; montant: number };
};

type SavingsData = {
  goals: any[];
  just_achieved: any[];
  reminders_count: number;
  reconciliation: Reconciliation;
};

function formatMoney(value: number): string {
  return `${value.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} €`;
}

export default function EpargneScreen() {
  const router = useRouter();
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const styles = getEpargneStyles(colorScheme);
  const { getSavings, deleteSavingsGoal, isLoading: apiLoading, isAuthenticated } = useApi();

  const [data, setData] = useState<SavingsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setIsLoading(true);
    getSavings()
      .then(setData)
      .catch((err: any) => setError(err.message || 'Impossible de charger les objectifs.'))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    if (apiLoading) return;
    if (!isAuthenticated) {
      setError('Tu dois être connecté.');
      setIsLoading(false);
      return;
    }
    load();
  }, [apiLoading, isAuthenticated]);

  const handleDelete = async (id: number) => {
    try {
      await deleteSavingsGoal(id);
      load();
    } catch (err: any) {
      setError(err.message || 'Suppression impossible.');
    }
  };

  const goals = data?.goals ?? [];
  const justAchieved = data?.just_achieved ?? [];
  const reminders = data?.reminders_count ?? 0;
  const recon = data?.reconciliation;

  return (
    <View style={styles.screen}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Text style={styles.backChevron}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Épargne</Text>
        {reminders > 0 && (
          <View style={styles.reminderBadge}>
            <Text style={styles.reminderBadgeText}>
              {reminders} rappel{reminders > 1 ? 's' : ''}
            </Text>
          </View>
        )}
      </View>

      {isLoading || apiLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.gold} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {error && <Text style={styles.error}>{error}</Text>}

          {justAchieved.length > 0 && (
            <View style={styles.achievedCard}>
              <Text style={styles.achievedTitle}>
                🎉 Objectif{justAchieved.length > 1 ? 's' : ''} atteint{justAchieved.length > 1 ? 's' : ''} !
              </Text>
              {justAchieved.map((g: any, i: number) => (
                <Text key={g.id ?? i} style={styles.achievedItemText}>
                  {g.label ?? g.title ?? g.name ?? 'Objectif'}
                </Text>
              ))}
            </View>
          )}

          {recon && (
            <View style={styles.reconCard}>
              <Text style={styles.reconTitle}>Épargne mensuelle</Text>

              <View style={recon.depassement.actif || recon.surplus.actif ? styles.reconRowWithGap : styles.reconRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.reconColLabel}>Disponible</Text>
                  <Text style={styles.reconColValue}>{formatMoney(recon.epargne_mensuelle)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.reconColLabel}>Affecté aux objectifs</Text>
                  <Text style={styles.reconColValue}>{formatMoney(recon.affecte_mensuel)}</Text>
                </View>
              </View>

              {!recon.has_cashflow_epargne && (
                <Text style={styles.reconHint}>Renseigne ton épargne dans le cash-flow pour suivre ta marge.</Text>
              )}

              {recon.depassement.actif && (
                <View style={styles.reconAlertError}>
                  <Text style={styles.reconAlertErrorText}>
                    Dépassement de {formatMoney(recon.depassement.montant)} — tu affectes plus que ton épargne disponible.
                  </Text>
                </View>
              )}

              {recon.surplus.actif && (
                <View style={styles.reconAlertSuccess}>
                  <Text style={styles.reconAlertSuccessText}>
                    Surplus de {formatMoney(recon.surplus.montant)} disponible à répartir.
                  </Text>
                </View>
              )}
            </View>
          )}

          <Text style={styles.sectionTitle}>Objectifs</Text>

          {goals.length === 0 ? (
            <Text style={styles.emptyText}>Aucun objectif pour le moment.</Text>
          ) : (
            goals.map((goal: any, i: number) => {
              const target = goal.target_amount ?? goal.target ?? null;
              const current = goal.current_amount ?? goal.current ?? 0;
              const ratio = target ? Math.min(current / target, 1) : 0;
              const isDone = ratio >= 1;

              return (
                <View key={goal.id ?? i} style={styles.goalCard}>
                  <Text style={styles.goalTitle}>{goal.label ?? goal.title ?? goal.name ?? 'Objectif'}</Text>

                  {target !== null && (
                    <>
                      <View style={styles.goalProgressTrack}>
                        <View style={[isDone ? styles.goalProgressFillDone : styles.goalProgressFill, { width: `${ratio * 100}%` }]} />
                      </View>
                      <Text style={styles.goalAmountText}>
                        {formatMoney(current)} / {formatMoney(target)}
                      </Text>
                    </>
                  )}

                  {goal.id && (
                    <Pressable onPress={() => handleDelete(goal.id)} style={styles.goalDeleteBtn}>
                      <Text style={styles.goalDeleteText}>Supprimer</Text>
                    </Pressable>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
}