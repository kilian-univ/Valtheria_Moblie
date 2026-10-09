import { LinearGradient } from 'expo-linear-gradient';
import { usePathname } from 'expo-router';
import { ReactNode, useEffect, useMemo } from 'react';
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

// Le dégradé est tracé de haut (nuit) en bas (or) sur un carré de côté la
// diagonale de l'écran, centré, puis tourné pour que l'or vise le coin : les
// coins de l'écran tombent alors aux extrémités du dégradé. Angle de cette
// rotation (radians) : il amène le bas du carré (0, 1) sur le coin.
function cornerAngle(corner: Corner, w: number, h: number): number {
  const v = cornerVector(corner, w, h);
  return Math.atan2(-v.x, v.y);
}

// Dessin du fond commun : couleur de fond, dégradé (dans `frame`, qui le
// tourne) et grain. Thème clair : fond uni.
function Backdrop({ frame }: { frame: (gradient: ReactNode, square: object) => ReactNode }) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const { width: w, height: h } = useWindowDimensions();

  if (colorScheme === 'light') {
    return <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]} />;
  }

  const diagonal = Math.ceil(Math.hypot(w, h));
  const square = { width: diagonal, height: diagonal, left: (w - diagonal) / 2, top: (h - diagonal) / 2 };
  const gradient = (
    <LinearGradient
      colors={[colors.backgroundNight, colors.background, colors.background, colors.backgroundGold]}
      locations={STOPS}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={StyleSheet.absoluteFill}
    />
  );

  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[StyleSheet.absoluteFill, styles.clip, { backgroundColor: colors.background }]}
    >
      {frame(gradient, square)}

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

// Fond commun de toute l'app, posé une fois à la racine, derrière la
// navigation : dégradé diagonal (bleu nuit dans un coin, noir au centre, or
// sombre dans le coin opposé, deux teintes aussi discrètes l'une que
// l'autre) et grain presque invisible. Il suit la taille de l'écran (fixe au
// défilement). Le coin de l'or vient de l'adresse (utils/backgroundCorner) et
// tourne quand on change d'onglet. Seuls les écrans racines des onglets le
// laissent voir : les pages poussées sur une pile sont opaques (OpaqueScreen).
export default function AppBackground() {
  const reduced = useReducedMotion();
  const pathname = usePathname();
  const { width: w, height: h } = useWindowDimensions();
  const corner = cornerForPath(pathname ?? '/', TABS);
  const target = useMemo(() => cornerAngle(corner, w, h), [corner, w, h]);

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

  return (
    <Backdrop
      frame={(gradient, square) => <Animated.View style={[styles.abs, square, gradientStyle]}>{gradient}</Animated.View>}
    />
  );
}

// Copie STATIQUE du fond commun pour une page poussée sur une pile : même
// dégradé, même grain, coin fixe de son onglet (`tab` : premier segment de
// l'adresse de l'onglet, ou de la page hors onglet). Aucune animation : elle
// ne tourne pas quand l'adresse change sous elle.
export function StaticBackground({ tab }: { tab: string }) {
  const { width: w, height: h } = useWindowDimensions();
  const angle = cornerAngle(cornerForPath(`/${tab}`, TABS), w, h);
  return (
    <Backdrop
      frame={(gradient, square) => <View style={[styles.abs, square, { transform: [{ rotate: `${angle}rad` }] }]}>{gradient}</View>}
    />
  );
}

// Page poussée sur une pile (fiche, module, outils, article, lecteur…) :
// opaque, avec sa propre copie du fond commun. Pendant l'ouverture, la
// fermeture ou le geste retour, elle ne laisse jamais voir l'écran du dessous.
export function OpaqueScreen({ tab, children }: { tab: string; children: ReactNode }) {
  return (
    <View style={styles.screen}>
      <StaticBackground tab={tab} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  clip: {
    overflow: 'hidden',
  },
  abs: {
    position: 'absolute',
  },
});
