import { LinearGradient } from 'expo-linear-gradient';
import { usePathname } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { Image, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { TAB_ROUTES } from '@/src/constants/tabs';
import { palette } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { Corner, cornerForPath } from '@/src/utils/backgroundCorner';

const GRAIN = require('@/assets/images/background/grain.webp');
const TABS = TAB_ROUTES.map((t) => t.name);

// Dégradé : nuit → background entre 40 % et 58 % → or
const STOPS = [0, 0.4, 0.58, 1] as const;
// Changement de coin
const MOVE_MS = 700;
const FADE_MS = 160;
const GRAIN_OPACITY = 0.05;

const ease = Easing.inOut(Easing.cubic);

// Vecteur centre → coin de l'or, sur l'écran
function cornerVector(corner: Corner, w: number, h: number): { x: number; y: number } {
  const x = corner === 'topRight' || corner === 'bottomRight' ? w / 2 : -w / 2;
  const y = corner === 'bottomLeft' || corner === 'bottomRight' ? h / 2 : -h / 2;
  return { x, y };
}

// Fond commun de toute l'app, posé une fois à la racine, derrière la
// navigation : dégradé diagonal (bleu nuit dans un coin, noir au centre, or
// sombre dans le coin opposé, deux teintes aussi discrètes l'une que
// l'autre) et grain presque invisible. Il suit la taille de l'écran (fixe au
// défilement). Le coin de l'or vient de l'adresse (utils/backgroundCorner).
export default function AppBackground() {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const reduced = useReducedMotion();
  const pathname = usePathname();
  const { width: w, height: h } = useWindowDimensions();
  const corner = cornerForPath(pathname ?? '/', TABS);

  // Le dégradé est tracé de haut (nuit) en bas (or) sur un carré de côté la
  // diagonale de l'écran, centré, puis tourné pour que l'or vise le coin :
  // les coins de l'écran tombent alors aux extrémités du dégradé.
  const diagonal = Math.ceil(Math.hypot(w, h));
  const target = useMemo(() => {
    const v = cornerVector(corner, w, h);
    // Rotation qui amène le bas du carré (0, 1) sur la direction du coin
    return Math.atan2(-v.x, v.y);
  }, [corner, w, h]);

  const angle = useSharedValue(target);
  const opacity = useSharedValue(1);

  // Changement de coin : le dégradé tourne en 700 ms (le plus court chemin),
  // ou fondu direct avec les animations réduites
  useEffect(() => {
    if (reduced) {
      opacity.set(withSequence(withTiming(0, { duration: FADE_MS }), withTiming(1, { duration: FADE_MS })));
      angle.set(withDelay(FADE_MS, withTiming(target, { duration: 0 })));
      return;
    }
    const from = angle.get();
    let delta = target - from;
    delta = Math.atan2(Math.sin(delta), Math.cos(delta)); // entre -π et π
    angle.set(withTiming(from + delta, { duration: MOVE_MS, easing: ease }));
  }, [target, reduced, angle, opacity]);

  const gradientStyle = useAnimatedStyle(() => ({
    opacity: opacity.get(),
    transform: [{ rotate: `${angle.get()}rad` }],
  }));

  // Thème clair : fond uni, comme avant
  if (colorScheme === 'light') {
    return <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]} />;
  }

  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[StyleSheet.absoluteFill, styles.clip, { backgroundColor: colors.background }]}
    >
      <Animated.View
        style={[
          styles.abs,
          { width: diagonal, height: diagonal, left: (w - diagonal) / 2, top: (h - diagonal) / 2 },
          gradientStyle,
        ]}
      >
        <LinearGradient
          colors={[colors.backgroundNight, colors.background, colors.background, colors.backgroundGold]}
          locations={STOPS}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* Grain : tuile de 128 × 128 px répétée, à 5 % */}
      <Image
        source={GRAIN}
        resizeMode="repeat"
        style={[StyleSheet.absoluteFill, { opacity: GRAIN_OPACITY, width: w, height: h }]}
        accessibilityIgnoresInvertColors
      />
    </View>
  );
}

const styles = StyleSheet.create({
  clip: {
    overflow: 'hidden',
  },
  abs: {
    position: 'absolute',
  },
});
