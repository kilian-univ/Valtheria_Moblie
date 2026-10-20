import { usePathname } from 'expo-router';
import { ReactNode, useEffect, useId, useMemo } from 'react';
import { Image, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, G, Image as SvgImage, LinearGradient as SvgLinearGradient, Mask, Pattern, RadialGradient, Rect, Stop } from 'react-native-svg';
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
import { backgroundGrain, backgroundHalo, palette } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { Corner, cornerForPath, oppositeCorner } from '@/src/utils/backgroundCorner';

const GRAIN = require('@/assets/images/background/grain.webp');
const TABS = TAB_ROUTES.map((t) => t.name);

// Changement de coin
const MOVE_MS = 700;
const FADE_MS = 160;
const GRAIN_OPACITY = backgroundGrain;
// Masque SVG : le blanc laisse voir, la transparence efface (indépendant du thème)
const MASK_WHITE = '#FFFFFF';

const ease = Easing.inOut(Easing.cubic);

// Coin de l'or : opposé au coin propre à l'onglet (le bleu nuit)
function goldCorner(path: string): Corner {
  return oppositeCorner(cornerForPath(path, TABS));
}

// Coin sur l'écran, en px
function cornerPoint(corner: Corner, w: number, h: number): { x: number; y: number } {
  return {
    x: corner === 'topRight' || corner === 'bottomRight' ? w : 0,
    y: corner === 'bottomLeft' || corner === 'bottomRight' ? h : 0,
  };
}

// Vecteur centre → coin de l'or, sur l'écran
function cornerVector(corner: Corner, w: number, h: number): { x: number; y: number } {
  const x = corner === 'topRight' || corner === 'bottomRight' ? w / 2 : -w / 2;
  const y = corner === 'bottomLeft' || corner === 'bottomRight' ? h / 2 : -h / 2;
  return { x, y };
}

// Les halos sont tracés sur un carré de côté la diagonale de l'écran, centré :
// le bleu nuit au milieu du bord haut, l'or au milieu du bord bas. Le carré
// est tourné pour que l'or vise son coin : le bleu tombe alors sur le coin
// opposé (les deux sont à une demi-diagonale du centre, comme les coins). Angle de cette
// rotation (radians) : il amène le bas du carré (0, 1) sur le coin.
function cornerAngle(corner: Corner, w: number, h: number): number {
  const v = cornerVector(corner, w, h);
  return Math.atan2(-v.x, v.y);
}

// Halos radiaux du fond (bleu nuit, or), centrés en (x, y), dans un dessin
// SVG : le dégradé s'éteint au rayon reach × largeur de l'écran
function HaloDefs({ id, night, gold, w }: { id: string; night: { x: number; y: number }; gold: { x: number; y: number }; w: number }) {
  return (
    <Defs>
      {(['night', 'gold'] as const).map((k) => {
        const halo = backgroundHalo[k];
        const at = k === 'night' ? night : gold;
        return (
          <RadialGradient key={k} id={`${id}${k}`} gradientUnits="userSpaceOnUse" cx={at.x} cy={at.y} r={halo.reach * w}>
            <Stop offset={0} stopColor={halo.color} stopOpacity={halo.opacity} />
            <Stop offset={1} stopColor={halo.color} stopOpacity={0} />
          </RadialGradient>
        );
      })}
    </Defs>
  );
}

// Dessin du fond commun : couleur de fond, halos (dans `frame`, qui les
// tourne) et grain. Thème clair : fond uni.
function Backdrop({ frame }: { frame: (gradient: ReactNode, square: object) => ReactNode }) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const { width: w, height: h } = useWindowDimensions();
  const id = `bg${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  const diagonal = Math.ceil(Math.hypot(w, h));
  const square = { width: diagonal, height: diagonal, left: (w - diagonal) / 2, top: (h - diagonal) / 2 };
  const gradient = (
    <Svg width={diagonal} height={diagonal} style={StyleSheet.absoluteFill}>
      <HaloDefs id={id} night={{ x: diagonal / 2, y: 0 }} gold={{ x: diagonal / 2, y: diagonal }} w={w} />
      <Rect x={0} y={0} width={diagonal} height={diagonal} fill={`url(#${id}night)`} />
      <Rect x={0} y={0} width={diagonal} height={diagonal} fill={`url(#${id}gold)`} />
    </Svg>
  );

  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[StyleSheet.absoluteFill, styles.clip, { backgroundColor: colors.background }]}
    >
      {frame(gradient, square)}

      {/* Grain : tuile de 128 × 128 px répétée, très légère (backgroundGrain) */}
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
// navigation : le fond #0D0D0F, un halo bleu nuit dans le coin propre à
// l'onglet, un halo doré dans le coin opposé, et un grain presque invisible. Il suit la taille de l'écran (fixe au
// défilement). Les coins viennent de l'adresse (utils/backgroundCorner) et
// tournent quand on change d'onglet. Seuls les écrans racines des onglets le
// laissent voir : les pages poussées sur une pile sont opaques (OpaqueScreen).
export default function AppBackground() {
  const reduced = useReducedMotion();
  const pathname = usePathname();
  const { width: w, height: h } = useWindowDimensions();
  const corner = goldCorner(pathname ?? '/');
  const target = useMemo(() => cornerAngle(corner, w, h), [corner, w, h]);

  const angle = useSharedValue(target);
  const opacity = useSharedValue(1);

  // Changement de coin : les halos tournent en 700 ms (le plus court chemin),
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

// Copie STATIQUE du fond commun pour une page poussée sur une pile : mêmes
// halos, même grain, coin fixe de son onglet (`tab` : premier segment de
// l'adresse de l'onglet, ou de la page hors onglet). Aucune animation : elle
// ne tourne pas quand l'adresse change sous elle.
export function StaticBackground({ tab }: { tab: string }) {
  const { width: w, height: h } = useWindowDimensions();
  const angle = cornerAngle(goldCorner(`/${tab}`), w, h);
  return (
    <Backdrop
      frame={(gradient, square) => <View style={[styles.abs, square, { transform: [{ rotate: `${angle}rad` }] }]}>{gradient}</View>}
    />
  );
}

// Fondu fait de la matière du fond (mêmes halos aux mêmes coins, même
// grain), redessiné en SVG sous un masque en dégradé continu : aucune
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

  // Halos du fond aux coins de l'écran, ramenés dans ce dessin (posé à top)
  const gold = cornerPoint(goldCorner(`/${tab}`), w, h);
  const night = cornerPoint(cornerForPath(`/${tab}`, TABS), w, h);

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
      <HaloDefs id={id} night={{ x: night.x, y: night.y - top }} gold={{ x: gold.x, y: gold.y - top }} w={w} />
      <Defs>
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
        <Rect x={0} y={0} width={w} height={height} fill={colors.background} />
        <Rect x={0} y={0} width={w} height={height} fill={`url(#${id}night)`} />
        <Rect x={0} y={0} width={w} height={height} fill={`url(#${id}gold)`} />
        <Rect x={0} y={0} width={w} height={height} fill={`url(#${id}p)`} opacity={GRAIN_OPACITY} />
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
