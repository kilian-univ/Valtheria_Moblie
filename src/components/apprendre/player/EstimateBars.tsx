import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import AppText from '@/src/components/common/AppText';
import { durations } from '@/src/constants/motion';
import { fonts, palette, radius, space } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { formatNumber } from '@/src/utils/format';

const BAR_H = 10;
const FILL_MS = 700;
const GAP_MS = 150;

type EstimateBarsProps = {
  estimate: number;
  actual: number;
  unit: string | null;
  decimals: number;
  // Délai avant la première barre (le grand chiffre défile d'abord)
  delay?: number;
};

// Deux barres à l'échelle sous la révélation : « Ton estimation », puis
// « En vrai » (en or), qui se remplissent l'une après l'autre. Animations
// réduites : barres pleines tout de suite.
export default function EstimateBars({ estimate, actual, unit, decimals, delay = durations.enterOpacity }: EstimateBarsProps) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const reduced = useReducedMotion();
  const max = Math.max(Math.abs(estimate), Math.abs(actual), 1e-9);
  const guessRatio = Math.abs(estimate) / max;
  const actualRatio = Math.abs(actual) / max;

  const guess = useSharedValue(reduced ? guessRatio : 0);
  const real = useSharedValue(reduced ? actualRatio : 0);

  useEffect(() => {
    if (reduced) {
      guess.set(guessRatio);
      real.set(actualRatio);
      return;
    }
    const ease = { duration: FILL_MS, easing: Easing.out(Easing.cubic) };
    guess.set(withDelay(delay, withTiming(guessRatio, ease)));
    real.set(withDelay(delay + FILL_MS + GAP_MS, withTiming(actualRatio, ease)));
  }, [reduced, guessRatio, actualRatio, delay, guess, real]);

  const guessStyle = useAnimatedStyle(() => ({ width: `${guess.get() * 100}%` }));
  const realStyle = useAnimatedStyle(() => ({ width: `${real.get() * 100}%` }));
  const withUnit = (n: number) => `${formatNumber(n, decimals)}${unit ? ` ${unit}` : ''}`;

  const row = (label: string, value: number, fill: object, color: string, tone: 'subtitle' | 'gold') => (
    <View style={styles.row}>
      <View style={styles.legend}>
        <AppText variant="caption" tone={tone}>
          {label}
        </AppText>
        <AppText variant="caption" tone={tone} style={styles.value}>
          {withUnit(value)}
        </AppText>
      </View>
      <View style={[styles.track, { backgroundColor: colors.surface }]}>
        <Animated.View style={[styles.fill, { backgroundColor: color }, fill]} />
      </View>
    </View>
  );

  return (
    <View
      style={styles.wrap}
      accessible
      accessibilityLabel={`Ton estimation : ${withUnit(estimate)}. En vrai : ${withUnit(actual)}.`}
    >
      {row('Ton estimation', estimate, guessStyle, colors.subtitle, 'subtitle')}
      {row('En vrai', actual, realStyle, colors.gold, 'gold')}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'stretch',
    gap: space[3],
  },
  row: {
    gap: space[1],
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  value: {
    fontFamily: fonts.bodySemibold,
    fontVariant: ['tabular-nums'],
  },
  track: {
    height: BAR_H,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.pill,
  },
});
