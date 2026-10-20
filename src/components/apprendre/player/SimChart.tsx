import { memo, useEffect, useEffectEvent, useId, useRef, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { easeOut, motion } from '@/src/constants/motion';
import { palette } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
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

// Courbes qui passent en 300 ms (ease-out) de l'ancienne forme à la nouvelle,
// point par point, les deux ensemble (un seul rendu par image). Animations
// réduites : la nouvelle tout de suite.
function useTween(target: number[]): number[] {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(target);
  const current = useRef(target);
  const key = target.join(',');

  // key : les valeurs, pas l'identité du tableau (useEffectEvent lit la cible
  // du moment sans relancer l'effet)
  const start = useEffectEvent((): (() => void) | undefined => {
    const from = current.current;
    if (reduced || from.length !== target.length) {
      current.current = target;
      setShown(target);
      return;
    }
    let frame = 0;
    let begin: number | null = null;
    const tick = (now: number) => {
      if (begin === null) begin = now;
      const p = easeOut(Math.min(1, (now - begin) / motion.screen));
      const next = target.map((v, i) => from[i] + (v - from[i]) * p);
      current.current = next;
      setShown(next);
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  });
  useEffect(() => start(), [key, reduced]);

  return shown;
}

type SimChartProps = {
  // Courbe pleine (l'argent qui grossit) et courbe en pointillés (versé)
  main: number[];
  base: number[];
  // Valeur du haut du dessin, la même quelle que soit la position du curseur
  scale: number;
};

// Petite courbe du simulateur, décorative : les chiffres sont lus ailleurs.
// Mémorisée : elle ne se redessine que quand ses courbes changent.
export default memo(function SimChart({ main, base, scale }: SimChartProps) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const [width, setWidth] = useState(0);
  const { height: windowHeight } = useWindowDimensions();
  const HEIGHT_NOW = windowHeight < REFERENCE_SCREEN_HEIGHT ? HEIGHT_MIN : HEIGHT;
  // Les deux courbes bout à bout, animées d'un seul tenant
  const both = useTween([...main, ...base]);
  const mainShown = both.slice(0, main.length);
  const baseShown = both.slice(main.length);

  // Tracés : mémorisés par le compilateur React (recalculés quand les points,
  // la largeur ou l'échelle changent)
  const paths = (() => {
    const top = Math.max(scale, 1e-9);
    const point = (v: number, i: number, n: number) =>
      `${((i / Math.max(1, n - 1)) * width).toFixed(1)},${(PAD + (1 - Math.max(0, v) / top) * (HEIGHT_NOW - 2 * PAD)).toFixed(1)}`;
    const line = (values: number[]) => values.map((v, i) => `${i === 0 ? 'M' : 'L'}${point(v, i, values.length)}`).join(' ');
    return {
      main: line(mainShown),
      base: line(baseShown),
      area: `${line(mainShown)} L${width},${HEIGHT_NOW} L0,${HEIGHT_NOW} Z`,
    };
  })();

  return (
    <View
      style={[styles.wrap, { height: HEIGHT_NOW }]}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {width > 0 ? (
        <Svg width={width} height={HEIGHT_NOW}>
          <Defs>
            <LinearGradient id={`area${id}`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={colors.gold} stopOpacity={AREA_OPACITY} />
              <Stop offset="1" stopColor={colors.gold} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Path d={paths.area} fill={`url(#area${id})`} />
          <Path d={paths.base} stroke={colors.subtitle} strokeWidth={BASE_WIDTH} strokeDasharray={DASH} fill="none" />
          <Path d={paths.main} stroke={colors.gold} strokeWidth={MAIN_WIDTH} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </Svg>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'stretch',
  },
});
