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
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';

import { TAB_ROUTES } from '@/src/constants/tabs';
import { palette } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { Corner, cornerForPath } from '@/src/utils/backgroundCorner';

const GRAIN = require('@/assets/images/background/grain.webp');
const TABS = TAB_ROUTES.map((t) => t.name);

// Dégradé : nuit → background entre 40 % et 58 % → or
const STOPS = [0, 0.4, 0.58, 1] as const;
// Lueur dorée sur le coin de l'or
const GLOW_W = 480;
const GLOW_H = 400;
// Changement de coin
const MOVE_MS = 700;
const FADE_MS = 160;
// Dérive lente autour du coin, en boucle (~60 s)
const DRIFT_X = 36;
const DRIFT_Y = 24;
const DRIFT_PERIOD = 60000;
const GRAIN_OPACITY = 0.05;

const ease = Easing.inOut(Easing.cubic);

// Angle (radians) du vecteur centre → coin de la lumière, sur l'écran
function cornerVector(corner: Corner, w: number, h: number): { x: number; y: number } {
  const x = corner === 'topRight' || corner === 'bottomRight' ? w / 2 : -w / 2;
  const y = corner === 'bottomLeft' || corner === 'bottomRight' ? h / 2 : -h / 2;
  return { x, y };
}

// Fond commun de toute l'app, posé une fois à la racine, derrière la
// navigation : dégradé diagonal nuit → or, lueur dorée sur le coin de l'or,
// grain presque invisible. Il suit la taille de l'écran (fixe au défilement).
// Le coin de la lumière vient de l'adresse (utils/backgroundCorner).
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
    const angle = Math.atan2(-v.x, v.y);
    return { angle, x: v.x, y: v.y };
  }, [corner, w, h]);

  const angle = useSharedValue(target.angle);
  const glowX = useSharedValue(target.x);
  const glowY = useSharedValue(target.y);
  const opacity = useSharedValue(1);
  const driftX = useSharedValue(0);
  const driftY = useSharedValue(0);

  // Changement de coin : glissement de 700 ms (le plus court chemin), ou
  // fondu direct avec les animations réduites
  useEffect(() => {
    if (reduced) {
      opacity.set(withSequence(withTiming(0, { duration: FADE_MS }), withTiming(1, { duration: FADE_MS })));
      const jump = { duration: 0 };
      angle.set(withDelay(FADE_MS, withTiming(target.angle, jump)));
      glowX.set(withDelay(FADE_MS, withTiming(target.x, jump)));
      glowY.set(withDelay(FADE_MS, withTiming(target.y, jump)));
      return;
    }
    const from = angle.get();
    let delta = target.angle - from;
    delta = Math.atan2(Math.sin(delta), Math.cos(delta)); // entre -π et π
    const move = { duration: MOVE_MS, easing: ease };
    angle.set(withTiming(from + delta, move));
    glowX.set(withTiming(target.x, move));
    glowY.set(withTiming(target.y, move));
  }, [target, reduced, angle, glowX, glowY, opacity]);

  // Dérive lente de la lueur autour de son coin (pas avec les animations réduites)
  useEffect(() => {
    if (reduced) {
      driftX.set(0);
      driftY.set(0);
      return;
    }
    const half = (d: number) => ({ duration: d, easing: Easing.inOut(Easing.sin) });
    driftX.set(
      withRepeat(withSequence(withTiming(DRIFT_X, half(DRIFT_PERIOD / 2)), withTiming(-DRIFT_X, half(DRIFT_PERIOD / 2))), -1, true)
    );
    driftY.set(
      withRepeat(withSequence(withTiming(-DRIFT_Y, half(DRIFT_PERIOD / 3)), withTiming(DRIFT_Y, half(DRIFT_PERIOD / 3))), -1, true)
    );
  }, [reduced, driftX, driftY]);

  const gradientStyle = useAnimatedStyle(() => ({
    opacity: opacity.get(),
    transform: [{ rotate: `${angle.get()}rad` }],
  }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: opacity.get(),
    transform: [{ translateX: glowX.get() + driftX.get() }, { translateY: glowY.get() + driftY.get() }],
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

      {/* Lueur centrée sur le coin de l'or (au centre de l'écran, puis déplacée) */}
      <Animated.View
        style={[styles.abs, { width: GLOW_W, height: GLOW_H, left: w / 2 - GLOW_W / 2, top: h / 2 - GLOW_H / 2 }, glowStyle]}
      >
        <Svg width={GLOW_W} height={GLOW_H}>
          <Defs>
            <RadialGradient id="appGlow" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={colors.backgroundGlow} stopOpacity={1} />
              <Stop offset="1" stopColor={colors.backgroundGlow} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Ellipse cx={GLOW_W / 2} cy={GLOW_H / 2} rx={GLOW_W / 2} ry={GLOW_H / 2} fill="url(#appGlow)" />
        </Svg>
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
