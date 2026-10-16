import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import AppText from '@/src/components/common/AppText';
import StreakMedal from '@/src/components/common/StreakMedal';
import { fonts, palette, radius, space } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { type AccuracyRecord, allTimeBestLine, CHALLENGES } from '@/src/utils/accuracy';
import { tap } from '@/src/utils/haptics';
import { MEDALS } from '@/src/utils/streakRewards';

const STREAK_MEDAL = 40;
const CHALLENGE_MEDAL = 34;

type MedalsCardProps = {
  // Médailles de série gagnées, et la dernière (null : aucune)
  medals: number;
  lastMedal: number | null;
  accuracy: AccuracyRecord | null;
  // Ouvre la feuille « Ta série » (médailles de série)
  onStreak: () => void;
};

// Carte Médailles du profil : les médailles de série (la dernière gagnée,
// leur nombre ; ouvre « Ta série »), puis les défis de précision à côté,
// médailles à l'éclair gagnées ou verrouillées, et la meilleure série de
// bonnes réponses d'affilée
export default function MedalsCard({ medals, lastMedal, accuracy, onStreak }: MedalsCardProps) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const earned = new Set(accuracy?.earned ?? []);
  const best = accuracy?.bestRun ?? 0;
  const challengeCount = CHALLENGES.filter((c) => earned.has(c.id)).length;

  return (
    <View style={[styles.card, { backgroundColor: colors.panel }]}>
      <Pressable
        onPress={() => {
          tap();
          onStreak();
        }}
        accessibilityRole="button"
        accessibilityLabel={
          medals > 0 ? `Médailles de série : ${medals} sur ${MEDALS.length}` : `Aucune médaille de série pour l’instant, la première à ${MEDALS[0].days} jours`
        }
        accessibilityHint="Ouvre ta série et tes médailles"
        style={({ pressed }) => [styles.streakRow, pressed && styles.pressed]}
      >
        <StreakMedal days={lastMedal ?? MEDALS[0].days} size={STREAK_MEDAL} earned={lastMedal !== null} />
        <View style={styles.texts}>
          <AppText maxFontSizeMultiplier={1.3} style={styles.value}>
            {medals > 0 ? `${medals} ${medals > 1 ? 'médailles' : 'médaille'}` : 'Médailles de série'}
            {medals > 0 ? <AppText style={[styles.unit, { color: colors.subtitle }]}>{` de série sur ${MEDALS.length}`}</AppText> : null}
          </AppText>
          {medals === 0 ? (
            <AppText variant="caption" tone="subtitle" style={styles.caption}>
              {`Première médaille à ${MEDALS[0].days} jours`}
            </AppText>
          ) : null}
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.subtitle} />
      </Pressable>

      <View style={[styles.rule, { backgroundColor: colors.border }]} />

      <View
        accessible
        accessibilityLabel={`Défis de précision : ${challengeCount} sur ${CHALLENGES.length}. ${CHALLENGES.map(
          (c) => `${c.title}, ${earned.has(c.id) ? 'gagné' : 'à gagner'}`
        ).join('. ')}. ${best > 0 ? allTimeBestLine(best) : 'Pas encore de série d’affilée'}`}
      >
        <AppText maxFontSizeMultiplier={1.3} style={styles.value}>
          Défis de précision
          <AppText style={[styles.unit, { color: colors.subtitle }]}>{` ${challengeCount} sur ${CHALLENGES.length}`}</AppText>
        </AppText>
        <View style={styles.challenges}>
          {CHALLENGES.map((c) => (
            <View key={c.id} style={styles.challenge}>
              <StreakMedal days={c.value} size={CHALLENGE_MEDAL} earned={earned.has(c.id)} kind={c.kind} />
              <AppText maxFontSizeMultiplier={1.2} numberOfLines={2} style={[styles.challengeLabel, { color: colors.subtitle }]}>
                {c.short}
              </AppText>
            </View>
          ))}
        </View>
        <View style={styles.bestRow}>
          <Ionicons name="flash" size={14} color={best > 0 ? colors.gold : colors.subtitle} />
          <AppText variant="caption" tone={best > 0 ? 'text' : 'subtitle'} style={styles.caption}>
            {best > 0 ? allTimeBestLine(best) : 'Ta série d’affilée commence à 3 bonnes réponses du premier coup'}
          </AppText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: space[3],
    borderRadius: radius.card,
    borderCurve: 'continuous',
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2] + 2,
    minHeight: 48,
  },
  pressed: {
    opacity: 0.7,
  },
  texts: {
    flex: 1,
  },
  value: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    lineHeight: 19,
  },
  unit: {
    fontFamily: fonts.bodyMedium,
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    flexShrink: 1,
  },
  rule: {
    height: StyleSheet.hairlineWidth,
    marginVertical: space[3],
  },
  challenges: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: space[3] + 2,
  },
  challenge: {
    flex: 1,
    alignItems: 'center',
    gap: space[1],
  },
  challengeLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 10,
    lineHeight: 13,
    textAlign: 'center',
  },
  bestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: space[3],
  },
});
