import { createContext, useContext, useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { motion, timing } from '@/src/constants/motion';
import { palette } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';

// Halo intérieur sur les bords de l'écran
const GLOW_BLUR = 60;
const GLOW_SPREAD = 6;

// Flash de réussite (vert) ou d'erreur (rouge) sur les bords de l'écran du
// lecteur, déclenché par un écran (carte de vrai ou faux) ou par le lecteur
// (feuille de réponse)
export const EdgeFlashContext = createContext<(right: boolean) => void>(() => {});

export function useEdgeFlash(): (right: boolean) => void {
  return useContext(EdgeFlashContext);
}

type EdgeFlashProps = {
  // Change à chaque flash (le même résultat deux fois rejoue le flash)
  flashKey: number;
  right: boolean;
};

// Bords de l'écran qui s'allument de la couleur du résultat : 300 ms en tout,
// ease-out. Ne capte aucun toucher. Animations réduites : rien.
export default function EdgeFlash({ flashKey, right }: EdgeFlashProps) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const reduced = useReducedMotion();
  const glow = useSharedValue(0);

  useEffect(() => {
    if (flashKey === 0 || reduced) return;
    glow.set(withSequence(withTiming(1, timing(motion.tap)), withTiming(0, timing(motion.screen - motion.tap))));
  }, [flashKey, reduced, glow]);

  const style = useAnimatedStyle(() => ({ opacity: glow.get() }));
  const color = right ? colors.success : colors.error;

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        StyleSheet.absoluteFill,
        { boxShadow: [{ inset: true, offsetX: 0, offsetY: 0, blurRadius: GLOW_BLUR, spreadDistance: GLOW_SPREAD, color }] },
        style,
      ]}
    />
  );
}
