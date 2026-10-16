import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import AppText from '@/src/components/common/AppText';
import { motion, timing } from '@/src/constants/motion';
import { fonts, palette, radius, space, titleLetterSpacing } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { formatInteger } from '@/src/utils/format';
import { barHeight, type WeekDayBar, type WeekSummary } from '@/src/utils/weekJournal';

const CHART = 70;
const BAR_W = 22;
const BAR_MIN = 4;
const TOTAL_SIZE = 17;

// « CETTE SEMAINE » : les XP gagnés chaque jour, du lundi au dimanche ;
// aujourd'hui mis en avant (barre plus claire, initiale en or). Les barres
// poussent à l'apparition (animations réduites : directement).
export default function WeekChart({ week }: { week: WeekSummary }) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const empty = week.lessons === 0;
  const spoken = empty
    ? 'Cette semaine : aucune leçon pour l’instant.'
    : `Cette semaine : ${week.totalXp} XP, ${week.lessons} ${week.lessons > 1 ? 'leçons' : 'leçon'}. ${week.days
        .filter((d) => d.xp > 0)
        .map((d) => `${d.name} ${d.xp} XP`)
        .join(', ')}.`;
  return (
    <View style={[styles.card, { backgroundColor: colors.panel }]} accessible accessibilityLabel={spoken}>
      <View style={styles.head}>
        <AppText variant="sectionLabel">CETTE SEMAINE</AppText>
        {empty ? null : (
          <AppText variant="caption" tone="subtitle">
            <AppText style={styles.total}>{`${formatInteger(week.totalXp).replace(/ /g, ' ')} XP`}</AppText>
            {` · ${week.lessons} ${week.lessons > 1 ? 'leçons' : 'leçon'}`}
          </AppText>
        )}
      </View>
      <View style={styles.bars}>
        {week.days.map((d, i) => (
          <Bar key={d.day} day={d} max={week.max} index={i} />
        ))}
      </View>
      {empty ? (
        <AppText variant="caption" tone="subtitle" style={styles.empty}>
          Ta première leçon de la semaine t’attend.
        </AppText>
      ) : null}
    </View>
  );
}

function Bar({ day, max, index }: { day: WeekDayBar; max: number; index: number }) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const reduced = useReducedMotion();
  const target = barHeight(day.xp, max, CHART, BAR_MIN);
  const grow = useSharedValue(reduced ? target : BAR_MIN);
  useEffect(() => {
    grow.set(reduced ? target : withDelay(motion.stagger * index, withTiming(target, timing(motion.max))));
  }, [target, reduced, index, grow]);
  const style = useAnimatedStyle(() => ({ height: grow.get() }));
  const fill = day.xp <= 0 ? colors.barEmpty : day.isToday ? colors.goldLight : colors.gold;
  return (
    <View style={styles.col}>
      <View style={styles.slot}>
        <Animated.View style={[styles.bar, { backgroundColor: fill }, style]} />
      </View>
      <AppText
        maxFontSizeMultiplier={1.2}
        style={[styles.initial, { color: day.isToday ? colors.gold : colors.subtitle }, day.isToday && styles.initialToday]}
      >
        {day.initial}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingVertical: space[3] + 2,
    paddingHorizontal: space[4],
    borderRadius: radius.card + 2,
    borderCurve: 'continuous',
  },
  head: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  total: {
    fontFamily: fonts.title,
    fontSize: TOTAL_SIZE,
    letterSpacing: titleLetterSpacing(TOTAL_SIZE),
  },
  bars: {
    flexDirection: 'row',
    gap: 6,
    marginTop: space[2] + 2,
  },
  col: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  slot: {
    height: CHART,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bar: {
    width: BAR_W,
    borderRadius: 6,
  },
  initial: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    lineHeight: 14,
  },
  initialToday: {
    fontFamily: fonts.bodyBold,
  },
  empty: {
    marginTop: space[2],
    textAlign: 'center',
  },
});
