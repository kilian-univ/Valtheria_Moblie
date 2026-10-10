import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import AppText from '@/src/components/common/AppText';
import StreakFlame from '@/src/components/common/StreakFlame';
import StreakMedal from '@/src/components/common/StreakMedal';
import { springs } from '@/src/constants/motion';
import { fonts, palette, radius, softShadow, space, titleLetterSpacing } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { formatInteger } from '@/src/utils/format';
import { tap } from '@/src/utils/haptics';
import { daysLabel, freezesLabel, nextMedal, nextRewardLabel, type WeekDay } from '@/src/utils/streakRewards';

const DEPTH = 6;
const RADIUS = 20;
const FLAME = 64;
const VALUE_SIZE = 28;
const DAY = 34;
const SMALL_MEDAL = 28;
const QUIET_OPACITY = 0.42;
const SINK_DURATION = 80; // comme le bouton principal
const NBSP = ' ';
// Seul emoji autorisé de l'app (validé) : la flamme de la série
const SMALL_FLAME = '\u{1F525}';

type GuestStreakCardProps = {
  streak: number;
  week: WeekDay[];
  xp: number;
  freezes: number;
  // Un gel a sauvé la série hier
  savedYesterday: boolean;
  // Allumage de la flamme (première apparition du jour), null : pas encore su
  ignite: boolean | null;
  onPress: () => void;
};

// Carte « Ta série » de l'accueil sans compte, en relief : flamme vivante,
// nombre de jours, semaine en cours, prochaine récompense, XP et gels.
// Touchée : la feuille « Ta série » (médailles, gel).
export default function GuestStreakCard({ streak, week, xp, freezes, savedYesterday, ignite, onPress }: GuestStreakCardProps) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const reduced = useReducedMotion();
  const press = useSharedValue(0);
  const faceStyle = useAnimatedStyle(() => ({ transform: [{ translateY: press.get() * DEPTH }] }));
  const lit = streak > 0;
  const next = nextMedal(streak);
  const reward = nextRewardLabel(streak);

  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      onPressIn={() => press.set(reduced ? 1 : withTiming(1, { duration: SINK_DURATION }))}
      onPressOut={() => press.set(reduced ? 0 : withSpring(0, springs.press))}
      accessibilityRole="button"
      accessibilityLabel={[
        lit ? `Ta série : ${daysLabel(streak)}` : 'Allume ta flamme. Termine une leçon aujourd’hui.',
        savedYesterday ? 'Ton gel a sauvé ta série hier.' : null,
        weekLabel(week),
        reward,
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

        <View style={styles.week}>
          {week.map((d, i) => (
            <View key={i} style={styles.day}>
              <DayDot day={d} />
              <AppText variant="caption" tone={d.isToday ? 'gold' : 'subtitle'} maxFontSizeMultiplier={1.3}>
                {d.letter}
              </AppText>
            </View>
          ))}
        </View>

        <View style={styles.bottom}>
          <View style={styles.reward}>
            {next && lit ? <StreakMedal days={next.days} size={SMALL_MEDAL} earned={false} /> : null}
            <AppText variant="caption" tone="subtitle" style={styles.rewardText}>
              {reward}
            </AppText>
          </View>
          <View style={styles.pills}>
            <View style={[styles.pill, { backgroundColor: colors.goldSoft }]}>
              <AppText variant="caption" tone="gold" style={styles.pillText}>{`${formatInteger(xp)}${NBSP}XP`}</AppText>
            </View>
            {freezes > 0 ? (
              <View style={[styles.pill, { backgroundColor: colors.frost }]}>
                <Ionicons name="snow" size={12} color={colors.frostInk} />
                <AppText variant="caption" style={[styles.pillText, { color: colors.frostInk }]}>
                  {freezesLabel(freezes)}
                </AppText>
              </View>
            ) : null}
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

// Jour de la semaine : série (or, petite flamme), sauvé par un gel (glacier,
// flocon), manqué (gris plein), avant le début ou à venir (contour discret).
// Aujourd'hui reste entouré.
function DayDot({ day }: { day: WeekDay }) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const look =
    day.state === 'done'
      ? { backgroundColor: colors.gold }
      : day.state === 'frozen'
        ? { backgroundColor: colors.frost }
        : day.state === 'missed'
          ? { backgroundColor: colors.surface2 }
          : day.state === 'quiet'
            ? { borderWidth: 1.5, borderColor: colors.controlBorder, opacity: QUIET_OPACITY }
            : { borderWidth: 1.5, borderColor: colors.controlBorder };
  return (
    <View style={[styles.dayDot, look, day.isToday && { borderWidth: 2, borderColor: colors.gold, opacity: 1 }]}>
      {day.state === 'done' ? (
        <Text allowFontScaling={false} style={styles.dayFlame}>
          {SMALL_FLAME}
        </Text>
      ) : day.state === 'frozen' ? (
        <Ionicons name="snow" size={15} color={colors.frostInk} />
      ) : null}
    </View>
  );
}

// « Cette semaine : lundi, leçon faite ; mardi, sauvé par un gel… »
function weekLabel(week: WeekDay[]): string {
  const states = {
    done: 'leçon faite',
    frozen: 'sauvé par un gel',
    missed: 'manqué',
    quiet: '',
    today: 'pas encore de leçon',
  };
  return `Cette semaine : ${week
    .filter((d) => d.state !== 'quiet' || d.isToday)
    .map((d) => `${d.name}${d.isToday ? ' (aujourd’hui)' : ''}, ${states[d.state] || 'à venir'}`)
    .join(' ; ')}`;
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
  week: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  day: {
    alignItems: 'center',
    gap: space[1],
  },
  dayDot: {
    width: DAY,
    height: DAY,
    borderRadius: DAY / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayFlame: {
    fontSize: 15,
    lineHeight: 19,
  },
  bottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
  },
  reward: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
  },
  rewardText: {
    flexShrink: 1,
  },
  pills: {
    flexDirection: 'row',
    gap: space[1] + 2,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: space[2] + 2,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  pillText: {
    fontFamily: fonts.bodySemibold,
    fontVariant: ['tabular-nums'],
  },
});
