import { LinearGradient } from 'expo-linear-gradient';
import { usePathname } from 'expo-router';
import { ReactNode, useEffect, useId, useMemo } from 'react';
import { Image, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, G, Image as SvgImage, LinearGradient as SvgLinearGradient, Mask, Pattern, Rect, Stop } from 'react-native-svg';
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
// Masque SVG : le blanc laisse voir, la transparence efface (indépendant du thème)
const MASK_WHITE = '#FFFFFF';

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

// Fondu fait de la matière du fond (même dégradé tourné vers le même coin,
// même grain), redessiné en SVG sous un masque en dégradé continu : aucune
// tranche, donc aucune bande, sur le web comme sur le téléphone.
const GRAIN_TILE = 128;
// Courbe du masque, adoucie aux deux bouts (12 paliers interpolés en continu)
const FADE_STEPS = 12;
function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

type BackdropFadeProps = {
  tab: string;
  // Position du fondu dans son parent, posé en haut de l'écran (le dessin du
  // fond s'aligne sur l'écran), et sa hauteur
  top: number;
  height: number;
  // 'in' : de transparent (en haut) au fond plein (en bas) ; 'out' : l'inverse
  direction: 'in' | 'out';
  // Partie pleine, avant le fondu ('out') ou après ('in')
  solid?: number;
};

// Fondu vers le fond commun (bas d'un décor, bande de la barre d'état).
// Posé en absolu ; ne capte aucun toucher.
export function BackdropFade({ tab, top, height, direction, solid = 0 }: BackdropFadeProps) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const { width: w, height: h } = useWindowDimensions();
  const id = `bf${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  // Dégradé du fond : tracé sur un carré de côté la diagonale, centré, tourné
  // vers le coin de l'onglet ; ses extrémités, ramenées dans ce dessin
  const angle = cornerAngle(cornerForPath(`/${tab}`, TABS), w, h);
  const half = Math.ceil(Math.hypot(w, h)) / 2;
  const cx = w / 2;
  const cy = h / 2 - top;
  const dx = -Math.sin(angle) * half;
  const dy = Math.cos(angle) * half;

  // Masque : opacité du fond selon la hauteur (1 : fond plein)
  const solidPart = Math.min(1, Math.max(0, solid / height));
  const masks = Array.from({ length: FADE_STEPS + 1 }, (_, i) => {
    const t = i / FADE_STEPS;
    return direction === 'in'
      ? { offset: t * (1 - solidPart), opacity: smooth(t) }
      : { offset: solidPart + t * (1 - solidPart), opacity: 1 - smooth(t) };
  });
  const stops = direction === 'in' ? [...masks, { offset: 1, opacity: 1 }] : [{ offset: 0, opacity: 1 }, ...masks];

  return (
    <Svg width={w} height={height} style={[styles.abs, { top, left: 0 }]} pointerEvents="none">
      <Defs>
        <SvgLinearGradient id={`${id}g`} gradientUnits="userSpaceOnUse" x1={cx - dx} y1={cy - dy} x2={cx + dx} y2={cy + dy}>
          <Stop offset={STOPS[0]} stopColor={colors.backgroundNight} />
          <Stop offset={STOPS[1]} stopColor={colors.background} />
          <Stop offset={STOPS[2]} stopColor={colors.background} />
          <Stop offset={STOPS[3]} stopColor={colors.backgroundGold} />
        </SvgLinearGradient>
        <Pattern
          id={`${id}p`}
          patternUnits="userSpaceOnUse"
          x={0}
          y={-top % GRAIN_TILE}
          width={GRAIN_TILE}
          height={GRAIN_TILE}
        >
          <SvgImage href={GRAIN} x={0} y={0} width={GRAIN_TILE} height={GRAIN_TILE} />
        </Pattern>
        <SvgLinearGradient id={`${id}f`} x1="0" y1="0" x2="0" y2="1">
          {stops.map((st, i) => (
            <Stop key={i} offset={st.offset} stopColor={MASK_WHITE} stopOpacity={st.opacity} />
          ))}
        </SvgLinearGradient>
        <Mask id={`${id}m`}>
          <Rect x={0} y={0} width={w} height={height} fill={`url(#${id}f)`} />
        </Mask>
      </Defs>
      <G mask={`url(#${id}m)`}>
        {colorScheme === 'light' ? (
          <Rect x={0} y={0} width={w} height={height} fill={colors.background} />
        ) : (
          <>
            <Rect x={0} y={0} width={w} height={height} fill={`url(#${id}g)`} />
            <Rect x={0} y={0} width={w} height={height} fill={`url(#${id}p)`} opacity={GRAIN_OPACITY} />
          </>
        )}
      </G>
    </Svg>
  );
}

// Fondu sous la barre d'état : 32 px
const SHADE_FADE = 32;

// Bande du haut d'une page qui défile sous la barre d'état : copie exacte du
// fond (même coin, même grain) sur la zone de sécurité, puis un fondu
// progressif. Le contenu qui remonte ne passe jamais sous l'heure ni la batterie.
export function StatusBarShade({ tab }: { tab: string }) {
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="none" style={[styles.shade, { height: insets.top + SHADE_FADE }]}>
      <BackdropFade tab={tab} top={0} height={insets.top + SHADE_FADE} direction="out" solid={insets.top} />
    </View>
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
  shade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  clip: {
    overflow: 'hidden',
  },
  abs: {
    position: 'absolute',
  },
});
