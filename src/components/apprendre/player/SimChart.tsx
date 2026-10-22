import { useEffect, useId, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { type SharedValue, useAnimatedProps, useAnimatedReaction, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { easeOut } from '@/src/constants/motion';
import { palette } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { blendRows, linePath } from '@/src/lesson/simulatorTable';
import { REFERENCE_SCREEN_HEIGHT } from '@/src/utils/fit';

// Hauteur voulue ; sur un écran bas (iPhone SE), la plus petite : le
// curseur doit rester visible sous l'encart
const HEIGHT = 96;
const HEIGHT_MIN = 56;
const MAIN_WIDTH = 3;
const BASE_WIDTH = 2;
const DASH = '4 4';
// Marge en haut et en bas : le trait ne touche pas les bords
const PAD = 4;
const AREA_OPACITY = 0.18;
// Passage d'une forme à l'autre quand le curseur change de cran
const BLEND_MS = 150;

const AnimatedPath = Animated.createAnimatedComponent(Path);

type SimChartProps = {
  // Courbe pleine (l'argent qui grossit) et courbe en pointillés (versé), une
  // ligne par cran du curseur (table du simulateur)
  main: number[][];
  base: number[][];
  // Ligne courante de la table, sur le fil d'interface (suivie pendant le
  // glissement, sans rendu React)
  row: SharedValue<number>;
  // Valeur du haut du dessin, la même quelle que soit la position du curseur
  scale: number;
};

// Petite courbe du simulateur, décorative : les chiffres sont lus ailleurs.
// Tout le dessin vit sur le fil d'interface : les tracés SVG sont calculés
// par Reanimated (useAnimatedProps) à partir de la table, et passent d'une
// forme à l'autre en 150 ms (ease-out) quand le curseur change de cran.
// Animations réduites : la nouvelle forme tout de suite.
export default function SimChart({ main, base, row, scale }: SimChartProps) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const reduced = useReducedMotion();
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const [width, setWidth] = useState(0);
  const { height: windowHeight } = useWindowDimensions();
  const height = windowHeight < REFERENCE_SCREEN_HEIGHT ? HEIGHT_MIN : HEIGHT;

  // Position fractionnaire dans la table : suit la ligne courante en douceur
  const position = useSharedValue(0);
  useAnimatedReaction(
    () => row.get(),
    (next, previous) => {
      if (previous === null || reduced) position.set(next);
      else position.set(withTiming(next, { duration: BLEND_MS, easing: easeOut }));
    },
    [reduced]
  );
  // Après la mise en page (largeur connue), la courbe se pose à sa place
  useEffect(() => {
    position.set(row.get());
  }, [width, position, row]);

  const mainProps = useAnimatedProps(() => ({ d: linePath(blendRows(main, position.get()), width, height, PAD, scale) }));
  const baseProps = useAnimatedProps(() => ({ d: linePath(blendRows(base, position.get()), width, height, PAD, scale) }));
  const areaProps = useAnimatedProps(() => ({
    d: `${linePath(blendRows(main, position.get()), width, height, PAD, scale)} L${width},${height} L0,${height} Z`,
  }));

  return (
    <View
      style={[styles.wrap, { height }]}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {width > 0 ? (
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id={`area${id}`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={colors.gold} stopOpacity={AREA_OPACITY} />
              <Stop offset="1" stopColor={colors.gold} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <AnimatedPath animatedProps={areaProps} fill={`url(#area${id})`} />
          <AnimatedPath animatedProps={baseProps} stroke={colors.subtitle} strokeWidth={BASE_WIDTH} strokeDasharray={DASH} fill="none" />
          <AnimatedPath
            animatedProps={mainProps}
            stroke={colors.gold}
            strokeWidth={MAIN_WIDTH}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </Svg>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'stretch',
  },
});
