import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';

import AppText from '@/src/components/common/AppText';
import Pill from '@/src/components/common/Pill';
import StreakFlame from '@/src/components/common/StreakFlame';
import StreakMedal from '@/src/components/common/StreakMedal';
import { springs } from '@/src/constants/motion';
import { fonts, palette, radius, softShadow, space, titleLetterSpacing } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { formatInteger } from '@/src/utils/format';
import { feedback } from '@/src/utils/feedback';
import { tap } from '@/src/utils/haptics';
import { daysLabel, freezesLabel, medalProgress } from '@/src/utils/streakRewards';
import { useReliefPress } from '@/src/hooks/useReliefPress';

const DEPTH = 6;
const RADIUS = 20;
const FLAME = 64;
const VALUE_SIZE = 28;
const TARGET_MEDAL = 32;
const BAR = 8;
const NBSP = ' ';

type GuestStreakCardProps = {
  streak: number;
  xp: number;
  freezes: number;
  // Un gel a sauvé la série hier
  savedYesterday: boolean;
  // Allumage de la flamme (première apparition du jour), null : pas encore su
  ignite: boolean | null;
  onPress: () => void;
};

// Carte « Ta série » de l'accueil sans compte, en relief : flamme vivante,
// nombre de jours, message du gel, barre vers la prochaine médaille, XP et
// gels. La semaine en cours est dans la feuille.
// Touchée : la feuille « Ta série » (médailles, gel).
export default function GuestStreakCard({ streak, xp, freezes, savedYesterday, ignite, onPress }: GuestStreakCardProps) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const reduced = useReducedMotion();
  const { faceStyle, onPressIn, onPressOut } = useReliefPress(DEPTH);
  const lit = streak > 0;
  const progress = medalProgress(streak);

  // La barre se remplit avec un ressort doux à l'apparition
  const fill = useSharedValue(reduced ? progress.ratio : 0);
  useEffect(() => {
    fill.set(reduced ? progress.ratio : withSpring(progress.ratio, springs.screen));
  }, [reduced, progress.ratio, fill]);
  // Gel qui a sauvé la série : son « freeze », une fois, à la première
  // apparition du jour (avec l'allumage de la flamme)
  useEffect(() => {
    if (savedYesterday && ignite === true) feedback.freeze();
  }, [savedYesterday, ignite]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${Math.round(fill.get() * 1000) / 10}%` }));

  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      accessibilityRole="button"
      accessibilityLabel={[
        lit ? `Ta série : ${daysLabel(streak)}` : 'Allume ta flamme. Termine une leçon aujourd’hui.',
        savedYesterday ? 'Ton gel a sauvé ta série hier.' : null,
        progress.label,
        `${formatInteger(xp)} XP`,
        freezes > 0 ? `${freezesLabel(freezes)} en réserve` : null,
      ]
        .filter(Boolean)
        .join('. ')}
      accessibilityHint="Ouvre le détail de ta série et tes médailles"
      style={styles.wrap}
    >
      <View style={[styles.edge, { backgroundColor: colors.surfaceEdge, boxShadow: softShadow(colors.groundShadow) }]} />
      <Animated.View style={[styles.face, { backgroundColor: colors.surface }, faceStyle]}>
        <View style={styles.top}>
          <StreakFlame days={streak} size={FLAME} ignite={ignite} />
          <View style={styles.texts}>
            <AppText maxFontSizeMultiplier={1.4} style={[styles.value, { color: colors.text }]}>
              {lit ? daysLabel(streak) : 'Allume ta flamme'}
            </AppText>
            <AppText variant="caption" tone="subtitle">
              {lit ? 'ta série' : 'Termine une leçon aujourd’hui'}
            </AppText>
            {savedYesterday ? (
              <View style={styles.saved}>
                <Ionicons name="snow" size={13} color={colors.frostInk} />
                <AppText variant="caption" style={{ color: colors.frostInk }}>
                  Ton gel a sauvé ta série hier.
                </AppText>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.progress}>
          <View style={styles.progressHead}>
            <AppText variant="caption" tone="subtitle" style={styles.rewardText}>
              {progress.label}
            </AppText>
            <View style={styles.pills}>
              <Pill size="sm" label={`${formatInteger(xp)}${NBSP}XP`} background={colors.goldSoft} color={colors.gold} />
              {freezes > 0 ? (
                <Pill size="sm" icon="snow" label={freezesLabel(freezes)} background={colors.frost} color={colors.frostInk} />
              ) : null}
            </View>
          </View>
          <View style={styles.barRow}>
            <View style={[styles.track, { backgroundColor: colors.surface2 }]}>
              <Animated.View style={[styles.fill, { backgroundColor: colors.gold }, fillStyle]} />
            </View>
            <StreakMedal days={progress.medal.days} size={TARGET_MEDAL} earned={progress.earned} />
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingBottom: DEPTH,
  },
  edge: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: DEPTH,
    bottom: 0,
    borderRadius: RADIUS,
    borderCurve: 'continuous',
  },
  face: {
    padding: space[4],
    gap: space[4],
    borderRadius: RADIUS,
    borderCurve: 'continuous',
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[4],
  },
  texts: {
    flex: 1,
    gap: 2,
  },
  value: {
    fontFamily: fonts.title,
    fontSize: VALUE_SIZE,
    lineHeight: 34,
    letterSpacing: titleLetterSpacing(VALUE_SIZE),
  },
  saved: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1],
    marginTop: 2,
  },
  progress: {
    gap: space[2],
  },
  progressHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
  },
  track: {
    flex: 1,
    height: BAR,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  fill: {
    height: BAR,
    borderRadius: radius.pill,
  },
  rewardText: {
    flex: 1,
  },
  pills: {
    flexDirection: 'row',
    gap: space[1] + 2,
  },
});
