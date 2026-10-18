import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import AppText from '@/src/components/common/AppText';
import { fonts, palette, radius, space, withOpacity } from '@/src/constants/style/Style';
import { useApi } from '@/src/context/ApiContext';
import { useTheme } from '@/src/context/ThemeContext';
import { useBudget } from '@/src/state/budgetData';
import { useBudgetPrefs } from '@/src/state/budgetPrefs';
import type { UserKey } from '@/src/state/userMemory';
import { localToday } from '@/src/utils/budget/dates';
import { BUDGET_MILESTONES, currentGreenRun, greenRunLabel } from '@/src/utils/budget/milestones';
import { tap } from '@/src/utils/haptics';

const BADGE = 36;

// Profil : les mois dans le vert d'affilée et les étapes du budget (gagnées
// au bilan du mois), à côté des médailles. Seulement une fois le budget mis
// en route. Ouvre Mon budget.
export default function BudgetStepsCard({ user }: { user: UserKey }) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const { user: account, get } = useApi();
  // Sans compte : pas de budget à relire
  const state = useBudget(account?.id != null ? user : null, get);
  const prefs = useBudgetPrefs(user);
  const budget = state.user === user ? state.budget : null;
  if (!budget?.settings.setupDone || !prefs) return null;

  const run = greenRunLabel(currentGreenRun(budget, localToday()));
  const earned = BUDGET_MILESTONES.filter((m) => prefs.milestones[m.key]);

  return (
    <Pressable
      onPress={() => {
        tap();
        router.push('/outils/budget');
      }}
      accessibilityRole="button"
      accessibilityLabel={`Ton budget. ${run ?? 'Pas encore de mois dans le vert'}. Étapes : ${earned.length} sur ${BUDGET_MILESTONES.length}. ${BUDGET_MILESTONES.map(
        (m) => `${m.title}, ${prefs.milestones[m.key] ? 'gagnée' : 'à gagner'}`
      ).join('. ')}`}
      accessibilityHint="Ouvre Mon budget"
      style={({ pressed }) => [styles.card, { backgroundColor: colors.panel }, pressed && styles.pressed]}
    >
      <View style={styles.head}>
        <AppText maxFontSizeMultiplier={1.3} style={styles.value}>
          Ton budget
          <AppText style={[styles.unit, { color: colors.subtitle }]}>{` · étapes ${earned.length} sur ${BUDGET_MILESTONES.length}`}</AppText>
        </AppText>
        <Ionicons name="chevron-forward" size={16} color={colors.subtitle} />
      </View>
      <View style={styles.regularity}>
        <Ionicons name="leaf-outline" size={14} color={run ? colors.success : colors.subtitle} />
        <AppText variant="caption" tone={run ? 'text' : 'subtitle'}>
          {run ?? 'Un mois dans le vert lance ta série'}
        </AppText>
      </View>
      <View style={styles.steps}>
        {BUDGET_MILESTONES.map((m) => {
          const got = !!prefs.milestones[m.key];
          return (
            <View key={m.key} style={styles.step}>
              <View
                style={[
                  styles.badge,
                  { backgroundColor: got ? withOpacity(colors.gold, 0.16) : colors.panelStrong, borderColor: got ? colors.gold : colors.border },
                ]}
              >
                <Ionicons name={m.icon as keyof typeof Ionicons.glyphMap} size={17} color={got ? colors.gold : colors.textFaint} />
              </View>
              <AppText maxFontSizeMultiplier={1.2} numberOfLines={2} style={[styles.stepLabel, { color: got ? colors.text : colors.subtitle }]}>
                {m.short}
              </AppText>
            </View>
          );
        })}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { padding: space[3], borderRadius: radius.card, borderCurve: 'continuous', gap: space[2] },
  pressed: { opacity: 0.7 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  value: { fontFamily: fonts.bodyBold, fontSize: 14, lineHeight: 19, flexShrink: 1 },
  unit: { fontFamily: fonts.bodyMedium },
  regularity: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  steps: { flexDirection: 'row', justifyContent: 'space-between', marginTop: space[1] },
  step: { flex: 1, alignItems: 'center', gap: space[1] },
  badge: { width: BADGE, height: BADGE, borderRadius: BADGE / 2, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  stepLabel: { fontFamily: fonts.bodyMedium, fontSize: 10, lineHeight: 13, textAlign: 'center' },
});
