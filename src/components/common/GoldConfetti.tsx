import { useEffect, useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { palette } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';

const PIECES = 28;
const DURATION = 2200;
const SPREAD_DELAY = 180;

// Pseudo-aléatoire stable (même gerbe à chaque rendu)
function seeded(i: number, salt: number): number {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

// Gerbe de confettis dorés, une seule fois, par-dessus l'écran (ne capte
// aucun toucher). Animations réduites : rien.
export default function GoldConfetti() {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const reduced = useReducedMotion();
  const { width, height } = useWindowDimensions();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (!reduced) progress.set(withTiming(1, { duration: DURATION, easing: Easing.out(Easing.quad) }));
  }, [reduced, progress]);

  const tones = [colors.gold, colors.goldDeep, colors.ivory];
  const pieces = useMemo(
    () =>
      Array.from({ length: PIECES }, (_, i) => ({
        x0: width / 2 + (seeded(i, 1) - 0.5) * 40,
        dx: (seeded(i, 2) - 0.5) * width * 1.1,
        rise: 80 + seeded(i, 3) * 160,
        fall: height * (0.45 + seeded(i, 4) * 0.4),
        spin: (seeded(i, 5) - 0.5) * 900,
        w: 6 + Math.round(seeded(i, 6) * 5),
        delay: Math.round(seeded(i, 7) * SPREAD_DELAY),
        tone: i % 3,
      })),
    [width, height]
  );

  if (reduced) return null;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {pieces.map((p, i) => (
        <Piece key={i} progress={progress} {...p} color={tones[p.tone]} top={height * 0.28} />
      ))}
    </View>
  );
}

function Piece({
  progress,
  x0,
  dx,
  rise,
  fall,
  spin,
  w,
  delay,
  color,
  top,
}: {
  progress: SharedValue<number>;
  x0: number;
  dx: number;
  rise: number;
  fall: number;
  spin: number;
  w: number;
  delay: number;
  color: string;
  top: number;
}) {
  const start = delay / DURATION;
  const style = useAnimatedStyle(() => {
    const t = Math.max(0, (progress.get() - start) / (1 - start));
    // Monte vite, puis retombe (parabole)
    const y = -rise * 4 * t * (1 - t) + fall * t * t;
    return {
      opacity: interpolate(t, [0, 0.05, 0.8, 1], [0, 1, 1, 0]),
      transform: [{ translateX: dx * t }, { translateY: y }, { rotate: `${spin * t}deg` }],
    };
  });
  return <Animated.View style={[styles.piece, { left: x0, top, width: w, height: w * 0.45, backgroundColor: color }, style]} />;
}

const styles = StyleSheet.create({
  piece: {
    position: 'absolute',
    borderRadius: 1,
  },
});
