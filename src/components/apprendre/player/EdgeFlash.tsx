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
// Halo doré de la série d'affilée, un peu plus long que celui du verdict
const GOLD_FLASH = 400;

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
  // Halo doré de la série d'affilée (400 ms) à la place du vert ou du rouge
  gold?: boolean;
};

// Bords de l'écran qui s'allument de la couleur du résultat : 300 ms en tout,
// ease-out (or : 400 ms, série d'affilée). Ne capte aucun toucher.
// Animations réduites : rien.
export default function EdgeFlash({ flashKey, right, gold = false }: EdgeFlashProps) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const reduced = useReducedMotion();
  const glow = useSharedValue(0);

  useEffect(() => {
    if (flashKey === 0 || reduced) return;
    const total = gold ? GOLD_FLASH : motion.screen;
    glow.set(withSequence(withTiming(1, timing(motion.tap)), withTiming(0, timing(total - motion.tap))));
  }, [flashKey, reduced, glow, gold]);

  const style = useAnimatedStyle(() => ({ opacity: glow.get() }));
  const color = gold ? colors.gold : right ? colors.success : colors.error;

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
