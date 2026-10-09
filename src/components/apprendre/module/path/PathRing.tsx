import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { durations } from '@/src/constants/motion';
import { palette } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { RING_DIAMETER, RING_STROKE } from '@/src/utils/modulePath';

type PathRingProps = {
  // Leçons terminées du module, de 0 à 1
  progress: number;
  color: string;
  // Apparition en fondu après ce délai (déverrouillage) ; absent : tout de suite
  appearDelay?: number;
};

// Anneau de progression autour du rond en cours (fond surface, arc couleur
// du module, depuis midi). Décoratif : la carte de leçon porte le texte.
export default function PathRing({ progress, color, appearDelay }: PathRingProps) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const opacity = useSharedValue(appearDelay === undefined ? 1 : 0);

  useEffect(() => {
    if (appearDelay === undefined) return;
    // Peut arriver après coup (déverrouillage au retour) : on repart de 0
    opacity.set(0);
    opacity.set(withDelay(appearDelay, withTiming(1, { duration: durations.enterOpacity })));
  }, [appearDelay, opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.get() }));

  const d = RING_DIAMETER;
  const r = (d - RING_STROKE) / 2;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.min(1, Math.max(0, Number.isFinite(progress) ? progress : 0));

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ width: d, height: d }, style]}
    >
      <Svg width={d} height={d} style={StyleSheet.absoluteFill}>
        <Circle cx={d / 2} cy={d / 2} r={r} stroke={colors.surface} strokeWidth={RING_STROKE} fill="none" />
        {clamped > 0 ? (
          <Circle
            cx={d / 2}
            cy={d / 2}
            r={r}
            stroke={color}
            strokeWidth={RING_STROKE}
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={circumference * (1 - clamped)}
            fill="none"
            transform={`rotate(-90 ${d / 2} ${d / 2})`}
          />
        ) : null}
      </Svg>
    </Animated.View>
  );
}
