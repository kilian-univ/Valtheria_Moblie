import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Text from '@/src/components/common/Text';

import { getEpargneStyles } from '@/src/constants/style/Style';
import { useApi } from '@/src/context/ApiContext';
import { useTheme } from '@/src/context/ThemeContext';
import { SavingsSkeleton } from '@/src/components/common/ScreenSkeletons';
import LoadErrorState from '@/src/components/common/LoadErrorState';
import PageState from '@/src/components/common/PageState';
import { actionErrorText, loadErrorKind, type LoadError } from '@/src/utils/loadError';
import { normalizeSavings, type SavingsData } from '@/src/utils/savings';

function formatMoney(value: number): string {
  return `${Number(value).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} €`;
}

// Marge haute de l'en-tête (celle de headerRow), sous la zone de sécurité
const HEADER_PAD = 16;

export default function EpargneScreen() {
  // En-tête sous la barre d'état : décalé de la zone de sécurité
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colorScheme } = useTheme();
  const styles = getEpargneStyles(colorScheme);
  const { getSavings, deleteSavingsGoal, isLoading: apiLoading, isAuthenticated } = useApi();

  const [data, setData] = useState<SavingsData | null>(null);
  // Chargement en échec (rien à montrer), et échec d'une action
  const [loadError, setLoadError] = useState<LoadError | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Réponse lue une fois (normalizeSavings) : jamais de champ manquant.
  // Relue à chaque tentative (ouverture, suppression, « Réessayer »)
  const [attempt, setAttempt] = useState(0);
  const load = useCallback(() => setAttempt((n) => n + 1), []);
  useEffect(() => {
    if (apiLoading || !isAuthenticated) return;
    let active = true;
    getSavings().then(
      (raw: unknown) => {
        if (!active) return;
        setData(normalizeSavings(raw));
        setLoadError(null);
      },
      (err: unknown) => {
        if (active) setLoadError(loadErrorKind(err));
      }
    );
    return () => {
      active = false;
    };
  }, [apiLoading, isAuthenticated, getSavings, attempt]);

  const handleDelete = async (id: number | string) => {
    try {
      await deleteSavingsGoal(id);
      setError(null);
      load();
    } catch (err: unknown) {
      setError(actionErrorText(err, 'Suppression impossible pour l’instant.'));
    }
  };
  const isLoading = !data && !loadError;

  const goals = data?.goals ?? [];
  const justAchieved = data?.just_achieved ?? [];
  const reminders = data?.reminders_count ?? 0;
  const recon = data?.reconciliation;

  return (
    <View style={styles.screen}>
      <View style={[styles.headerRow, { paddingTop: insets.top + HEADER_PAD }]}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Text style={styles.backChevron}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Épargne</Text>
        {reminders > 0 ? (
          <View style={styles.reminderBadge}>
            <Text style={styles.reminderBadgeText}>
              {reminders} rappel{reminders > 1 ? 's' : ''}
            </Text>
          </View>
        ) : null}
      </View>

      {!apiLoading && !isAuthenticated ? (
        <PageState
          variant="empty"
          text="Connecte-toi pour suivre tes objectifs d’épargne."
          actionLabel="Se connecter"
          onAction={() => router.push('/client/login')}
        />
      ) : !data && loadError ? (
        <LoadErrorState title="Épargne indisponible" what="tes objectifs" kind={loadError} onRetry={() => { setLoadError(null); load(); }} />
      ) : isLoading || apiLoading ? (
        <SavingsSkeleton />
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {error ? <Text style={styles.error}>{error}</Text> : null}

          {justAchieved.length > 0 ? (
            <View style={styles.achievedCard}>
              <Text style={styles.achievedTitle}>
                🎉 Objectif{justAchieved.length > 1 ? 's' : ''} atteint{justAchieved.length > 1 ? 's' : ''} !
              </Text>
              {justAchieved.map((g, i) => (
                <Text key={g.id ?? i} style={styles.achievedItemText}>
                  {g.label}
                </Text>
              ))}
            </View>
          ) : null}

          {recon ? (
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

              {!recon.has_cashflow_epargne ? (
                <Text style={styles.reconHint}>Renseigne ton épargne dans le cash-flow pour suivre ta marge.</Text>
              ) : null}

              {recon.depassement.actif ? (
                <View style={styles.reconAlertError}>
                  <Text style={styles.reconAlertErrorText}>
                    Dépassement de {formatMoney(recon.depassement.montant)} — tu affectes plus que ton épargne disponible.
                  </Text>
                </View>
              ) : null}

              {recon.surplus.actif ? (
                <View style={styles.reconAlertSuccess}>
                  <Text style={styles.reconAlertSuccessText}>
                    Surplus de {formatMoney(recon.surplus.montant)} disponible à répartir.
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}

          <Text style={styles.sectionTitle}>Objectifs</Text>

          {goals.length === 0 ? (
            <Text style={styles.emptyText}>Aucun objectif pour le moment.</Text>
          ) : (
            goals.map((goal, i) => {
              const target = goal.target;
              const current = goal.current;
              const ratio = target ? Math.min(current / target, 1) : 0;
              const isDone = ratio >= 1;

              return (
                <View key={goal.id ?? i} style={styles.goalCard}>
                  <Text style={styles.goalTitle}>{goal.label}</Text>

                  {target !== null ? (
                    <>
                      <View style={styles.goalProgressTrack}>
                        <View style={[isDone ? styles.goalProgressFillDone : styles.goalProgressFill, { width: `${ratio * 100}%` }]} />
                      </View>
                      <Text style={styles.goalAmountText}>
                        {formatMoney(current)} / {formatMoney(target)}
                      </Text>
                    </>
                  ) : null}

                  {goal.id !== null ? (
                    <Pressable onPress={() => handleDelete(goal.id as number | string)} style={styles.goalDeleteBtn}>
                      <Text style={styles.goalDeleteText}>Supprimer</Text>
                    </Pressable>
                  ) : null}
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
}