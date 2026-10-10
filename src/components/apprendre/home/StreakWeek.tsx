import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import AppText from '@/src/components/common/AppText';
import { palette, space } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import type { WeekDay } from '@/src/utils/streakRewards';

const DAY = 34;
const QUIET_OPACITY = 0.42;
// Seul emoji autorisé de l'app (validé) : la flamme de la série
const SMALL_FLAME = '\u{1F525}';

// Semaine en cours en sept pastilles (L M M J V S D), dans la feuille « Ta série »
export default function StreakWeek({ week }: { week: WeekDay[] }) {
  return (
    <View style={styles.week} accessible accessibilityLabel={weekLabel(week)}>
      {week.map((d, i) => (
        <View key={i} style={styles.day}>
          <DayDot day={d} />
          <AppText variant="caption" tone={d.isToday ? 'gold' : 'subtitle'} maxFontSizeMultiplier={1.3}>
            {d.letter}
          </AppText>
        </View>
      ))}
    </View>
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
  week: {
    alignSelf: 'stretch',
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
});
