import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AppText from '@/src/components/common/AppText';
import AssetIcon from '@/src/components/common/AssetIcon';
import Button from '@/src/components/common/Button';
import IconButton from '@/src/components/common/IconButton';
import TextField from '@/src/components/common/TextField';
import DateField from '@/src/components/patrimoine/DateField';
import Segmented from '@/src/components/patrimoine/Segmented';
import { fonts, palette, space } from '@/src/constants/style/Style';
import { useApi } from '@/src/context/ApiContext';
import { useTheme } from '@/src/context/ThemeContext';
import { usePatrimoine } from '@/src/state/patrimoineData';
import { updatePatrimoinePrefs, usePatrimoinePrefs } from '@/src/state/patrimoinePrefs';
import { userKeyOf } from '@/src/state/userMemory';
import { feedback } from '@/src/utils/feedback';
import { tap } from '@/src/utils/haptics';
import { money } from '@/src/utils/patrimoine/format';
import { dayOf, isoDay, parseIsoDay, type Day } from '@/src/utils/patrimoine/forms';
import { defaultGoalPositionIds, EMERGENCY_MONTHS, linkedPositions, sameLinks, validateGoal } from '@/src/utils/patrimoine/goals';
import { valueEurOf } from '@/src/utils/patrimoine/model';
import { parseDecimal } from '@/src/utils/patrimoine/preview';

const MONTH_OPTIONS = [3, 4, 5, 6].map((n) => ({ key: String(n), label: `${n} mois` }));

// Objectifs : l'épargne de précaution (dépenses mensuelles, 3 à 6 mois) ou un
// objectif personnel (nom, montant, date facultative, placements sur
// lesquels il se mesure). Sur le téléphone.
export default function ObjectifScreen() {
  const insets = useSafeAreaInsets();
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const { kind, id } = useLocalSearchParams<{ kind?: string; id?: string }>();
  const { user, getPortfolio } = useApi();
  const userKey = userKeyOf(user?.id);
  const prefs = usePatrimoinePrefs(userKey);
  // Placements du compte (déjà chargés par Mon patrimoine, sinon relus)
  const data = usePatrimoine(user?.id != null ? userKey : null, getPortfolio);
  const positions = data.portfolio?.positions ?? null;
  const hidden = prefs?.discreet ?? false;
  const goal = id ? prefs?.goals.find((g) => g.id === id) ?? null : null;
  const precaution = kind === 'precaution';

  const [edits, setEdits] = useState<{ expenses?: string; months?: string; name?: string; amount?: string; date?: Day | null; positionIds?: number[] }>({});
  const [error, setError] = useState<string | null>(null);
  const [today] = useState(() => dayOf(new Date()));
  const later = { y: today.y + 50, m: 12, d: 31 };

  const expenses = edits.expenses ?? (prefs?.emergency.monthlyExpenses ? String(prefs.emergency.monthlyExpenses).replace('.', ',') : '');
  const months = edits.months ?? String(prefs?.emergency.months ?? EMERGENCY_MONTHS.default);
  const name = edits.name ?? goal?.name ?? '';
  const amount = edits.amount ?? (goal ? String(goal.amount).replace('.', ',') : '');
  const date = edits.date !== undefined ? edits.date : goal ? parseIsoDay(goal.date) : null;
  // Placements cochés : ceux de l'objectif, ou les placements sans risque
  const checked = edits.positionIds ?? (positions ? (goal ? linkedPositions(goal, positions).map((p) => p.id) : defaultGoalPositionIds(positions)) : []);
  const toggle = (positionId: number) => {
    tap();
    setEdits((e) => ({ ...e, positionIds: checked.includes(positionId) ? checked.filter((x) => x !== positionId) : [...checked, positionId] }));
  };

  const close = () => router.back();

  const save = () => {
    if (precaution) {
      const value = parseDecimal(expenses);
      if (!(value > 0)) {
        setError('Indique tes dépenses d’un mois, en euros.');
        return;
      }
      updatePatrimoinePrefs(userKey, (p) => ({ ...p, emergency: { monthlyExpenses: value, months: Number(months) } }));
      feedback.right(0.6);
      close();
      return;
    }
    const v = validateGoal({ name, amount, date: date ? isoDay(date) : null });
    if (!v.ok) {
      setError(v.message);
      return;
    }
    // Placements inchangés : ceux de l'objectif (ou, sans placements chargés,
    // les placements sans risque suivis automatiquement)
    const positionIds = edits.positionIds ?? (goal ? goal.positionIds : positions ? defaultGoalPositionIds(positions) : null);
    updatePatrimoinePrefs(userKey, (p) => ({
      ...p,
      goals: goal
        ? p.goals.map((g) =>
            g.id === goal.id
              ? { ...g, name: v.name, amount: v.amount, date: v.date, positionIds, reachedAt: v.amount !== g.amount || !sameLinks(positionIds, g.positionIds) ? null : g.reachedAt }
              : g
          )
        : [...p.goals, { id: `g${Date.now()}`, name: v.name, amount: v.amount, date: v.date, createdAt: new Date().toISOString(), reachedAt: null, positionIds }],
    }));
    feedback.right(0.6);
    close();
  };

  const remove = () => {
    if (!goal) return;
    updatePatrimoinePrefs(userKey, (p) => ({ ...p, goals: p.goals.filter((g) => g.id !== goal.id) }));
    feedback.drop();
    close();
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.bar}>
        <IconButton icon="close" accessibilityLabel="Fermer" onPress={close} />
        <AppText variant="bodyMedium" accessibilityRole="header" style={styles.barTitle}>
          {precaution ? 'Épargne de précaution' : goal ? 'Ton objectif' : 'Nouvel objectif'}
        </AppText>
        <View style={styles.spacer} />
      </View>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive">
          {precaution ? (
            <>
              <AppText variant="callout" tone="subtitle">
                Un coussin pour les imprévus : de 3 à 6 mois de dépenses, gardés sur des placements sans risque (livrets).
              </AppText>
              <TextField
                label="Tes dépenses par mois (€)"
                value={expenses}
                onChangeText={(t) => {
                  setError(null);
                  setEdits((e) => ({ ...e, expenses: t }));
                }}
                keyboardType="decimal-pad"
                placeholder="Loyer, courses, factures…"
                error={error}
              />
              <AppText variant="caption" tone="subtitle">
                Combien de mois veux-tu couvrir ?
              </AppText>
              <Segmented fill options={MONTH_OPTIONS} value={months} onChange={(m) => setEdits((e) => ({ ...e, months: m }))} />
            </>
          ) : (
            <>
              <TextField
                label="Nom de l’objectif"
                value={name}
                onChangeText={(t) => {
                  setError(null);
                  setEdits((e) => ({ ...e, name: t }));
                }}
                placeholder="Apport pour un logement, voyage…"
                maxLength={60}
              />
              <TextField
                label="Montant à atteindre (€)"
                value={amount}
                onChangeText={(t) => {
                  setError(null);
                  setEdits((e) => ({ ...e, amount: t }));
                }}
                keyboardType="decimal-pad"
                placeholder="0"
                error={error}
              />
              {date ? (
                <View style={styles.dateRow}>
                  <DateField label="Échéance" title="Échéance de l’objectif" value={date} min={today} max={later} onChange={(d) => setEdits((e) => ({ ...e, date: d }))} />
                  <Button variant="text" size="sm" label="Sans échéance" onPress={() => setEdits((e) => ({ ...e, date: null }))} />
                </View>
              ) : (
                <Button variant="link" label="Ajouter une échéance" onPress={() => setEdits((e) => ({ ...e, date: { ...today, y: today.y + 1 } }))} />
              )}
              <AppText variant="sectionLabel" accessibilityRole="header" style={styles.linksTitle}>
                PLACEMENTS SUIVIS
              </AppText>
              {positions === null ? (
                <AppText variant="caption" tone="subtitle">
                  {data.status === 'error' ? 'Tes placements ne se chargent pas pour l’instant : l’objectif garde ceux qu’il suit.' : 'Chargement de tes placements…'}
                </AppText>
              ) : positions.length === 0 ? (
                <AppText variant="caption" tone="subtitle">
                  Ajoute un placement à ton patrimoine pour suivre cet objectif.
                </AppText>
              ) : (
                <>
                  <AppText variant="caption" tone="subtitle">
                    L’objectif se mesure sur la valeur des placements cochés. Par défaut, tes placements sans risque.
                  </AppText>
                  <View>
                    {positions.map((p, i) => {
                      const on = checked.includes(p.id);
                      return (
                        <Pressable
                          key={p.id}
                          onPress={() => toggle(p.id)}
                          accessibilityRole="checkbox"
                          aria-checked={on}
                          accessibilityLabel={`${p.name || p.ticker}, ${hidden ? 'montant masqué' : money(valueEurOf(p))}`}
                          style={({ pressed }) => [styles.link, i < positions.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }, pressed && { opacity: 0.7 }]}
                        >
                          <AssetIcon logoUrl={p.logoUrl} name={p.name} ticker={p.ticker} type={p.type} size={32} />
                          <View style={styles.flex}>
                            <AppText numberOfLines={1} style={styles.linkName}>
                              {p.name || p.ticker}
                            </AppText>
                            <AppText variant="caption" tone="subtitle">
                              {money(valueEurOf(p), { hidden })}
                            </AppText>
                          </View>
                          <Ionicons name={on ? 'checkbox' : 'square-outline'} size={24} color={on ? colors.gold : colors.subtitle} />
                        </Pressable>
                      );
                    })}
                  </View>
                  {checked.length === 0 ? (
                    <AppText variant="caption" style={{ color: colors.gold }}>
                      Aucun placement coché : l’objectif ne sera pas suivi.
                    </AppText>
                  ) : null}
                </>
              )}
            </>
          )}
        </ScrollView>
        <View style={[styles.footer, { paddingBottom: insets.bottom + space[3] }]}>
          <Button label={goal || (precaution && prefs?.emergency.monthlyExpenses) ? 'Enregistrer' : precaution ? 'Suivre mon épargne de précaution' : 'Créer l’objectif'} onPress={save} />
          {goal ? <Button variant="textDanger" label="Supprimer l’objectif" onPress={remove} /> : null}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space[3], minHeight: 52 },
  barTitle: { fontFamily: fonts.bodyBold, fontSize: 17 },
  spacer: { width: 44 },
  content: { paddingHorizontal: space[5], paddingTop: space[3], gap: space[3] },
  dateRow: { flexDirection: 'row', alignItems: 'flex-end', gap: space[2] },
  linksTitle: { marginTop: space[3] },
  link: { flexDirection: 'row', alignItems: 'center', gap: space[3], minHeight: 56, paddingVertical: space[2] },
  linkName: { fontFamily: fonts.bodySemibold, fontSize: 15 },
  footer: { paddingHorizontal: space[5], paddingTop: space[2], gap: space[1], alignItems: 'stretch' },
});
