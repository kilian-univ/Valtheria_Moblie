import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import AppText from '@/src/components/common/AppText';
import { fonts, palette, radius, space, withOpacity } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { usePatrimoinePrefs } from '@/src/state/patrimoinePrefs';
import type { UserKey } from '@/src/state/userMemory';
import { tap } from '@/src/utils/haptics';
import { MILESTONES } from '@/src/utils/patrimoine/milestones';
import { currentStreak, streakLabel } from '@/src/utils/patrimoine/regularity';

const BADGE = 36;

// Profil : la régularité du patrimoine (mois d'affilée avec un versement) et
// les étapes à collectionner, à côté des médailles. Ouvre Mon patrimoine.
export default function PatrimoineStepsCard({ user }: { user: UserKey }) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const prefs = usePatrimoinePrefs(user);
  const [now] = useState(() => new Date());
  if (!prefs) return null;

  const streak = currentStreak(prefs.months, now);
  const label = streakLabel(streak);
  const earned = MILESTONES.filter((m) => prefs.milestones[m.key]);

  return (
    <Pressable
      onPress={() => {
        tap();
        router.push('/outils/portefeuille');
      }}
      accessibilityRole="button"
      accessibilityLabel={`Ton patrimoine. Régularité : ${label ?? 'pas encore de versement ce mois-ci'}. Étapes : ${earned.length} sur ${MILESTONES.length}. ${MILESTONES.map(
        (m) => `${m.title}, ${prefs.milestones[m.key] ? 'gagnée' : 'à gagner'}`
      ).join('. ')}`}
      accessibilityHint="Ouvre Mon patrimoine"
      style={({ pressed }) => [styles.card, { backgroundColor: colors.panel }, pressed && styles.pressed]}
    >
      <View style={styles.head}>
        <AppText maxFontSizeMultiplier={1.3} style={styles.value}>
          Ton patrimoine
          <AppText style={[styles.unit, { color: colors.subtitle }]}>{` · étapes ${earned.length} sur ${MILESTONES.length}`}</AppText>
        </AppText>
        <Ionicons name="chevron-forward" size={16} color={colors.subtitle} />
      </View>
      <View style={styles.regularity}>
        <Ionicons name="calendar-outline" size={14} color={streak > 0 ? colors.gold : colors.subtitle} />
        <AppText variant="caption" tone={streak > 0 ? 'text' : 'subtitle'}>
          {label ? `Régularité : ${label}` : 'Un versement par mois lance ta régularité'}
        </AppText>
      </View>
      <View style={styles.steps}>
        {MILESTONES.map((m) => {
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
