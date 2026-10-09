import { createContext, useContext, useEffect } from 'react';
import { Image, ImageSourcePropType, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { springs } from '@/src/constants/motion';
import { fitHeight, windowFitHeight } from '@/src/utils/fit';
import GoldHalo from './GoldHalo';

export type ValPose = 'saut' | 'fier' | 'salut';

// Val en pied, fond transparent, 800 px de haut (liseré vert du détourage
// neutralisé à l'import). ratio = largeur / hauteur.
const POSES: Record<ValPose, { source: ImageSourcePropType; ratio: number }> = {
  saut: { source: require('@/assets/images/val/val-pied-saut.webp'), ratio: 603 / 800 },
  fier: { source: require('@/assets/images/val/val-pied-fier.webp'), ratio: 534 / 800 },
  salut: { source: require('@/assets/images/val/val-pied-salut.webp'), ratio: 534 / 800 },
};

export const VAL_FULL_BODY_MIN = 160;
const RISE = 24;
const FROM_SCALE = 0.9;
const BOUNCE_HEIGHT = 8;
const BOUNCE_PERIOD = 1400;
const BOUNCE_START = 600; // une fois l'arrivée posée
const BREATH_SCALE = 1.02;
const BREATH_PERIOD = 3000;
// Carré de la lueur : au plus 1,5 fois l'image (règle de GoldHalo)
const HALO_RATIO = 1.15;

// Dépassement du contenu mesuré par FitFrame (écrans de fin) : Val se réduit
// d'autant. null hors d'un FitFrame : réduction selon la hauteur de l'écran.
export const ValFitContext = createContext<number | null>(null);

type ValFullBodyProps = {
  pose: ValPose;
  // Hauteur voulue ; réduite sur petit écran, jamais sous `minHeight`
  height: number;
  minHeight?: number;
  // Petit rebond vertical en boucle tant que l'écran est affiché
  bounce?: boolean;
  // Petite lueur dorée derrière Val
  halo?: boolean;
  // Largeur imposée (chemin du module) : la hauteur en découle, sans réduction
  width?: number;
  // Respiration lente en boucle (échelle 1 → 1,02, 3 s)
  breathe?: boolean;
};

// Val en pied, jamais recadré (contain). Arrivée avec le ressort celebrate
// (montée de 24, échelle 0,9 → 1). Animations réduites : affichage direct,
// sans rebond.
export default function ValFullBody({
  pose,
  height,
  minHeight = VAL_FULL_BODY_MIN,
  bounce = false,
  halo = false,
  width,
  breathe = false,
}: ValFullBodyProps) {
  const reduced = useReducedMotion();
  const excess = useContext(ValFitContext);
  const { height: windowHeight } = useWindowDimensions();
  const { source, ratio } = POSES[pose];
  const h =
    width !== undefined
      ? Math.round(width / ratio)
      : excess === null
        ? windowFitHeight(height, minHeight, windowHeight)
        : fitHeight(height, minHeight, excess);

  const rise = useSharedValue(reduced ? 0 : RISE);
  const scale = useSharedValue(reduced ? 1 : FROM_SCALE);
  const loop = useSharedValue(0);
  const breath = useSharedValue(1);

  useEffect(() => {
    if (reduced) return;
    rise.set(withSpring(0, springs.celebrate));
    scale.set(withSpring(1, springs.celebrate));
    if (breathe) {
      const halfBreath = { duration: BREATH_PERIOD / 2, easing: Easing.inOut(Easing.sin) };
      breath.set(withRepeat(withSequence(withTiming(BREATH_SCALE, halfBreath), withTiming(1, halfBreath)), -1));
    }
    if (!bounce) return;
    const half = { duration: BOUNCE_PERIOD / 2, easing: Easing.inOut(Easing.sin) };
    loop.set(
      withDelay(BOUNCE_START, withRepeat(withSequence(withTiming(-BOUNCE_HEIGHT, half), withTiming(0, half)), -1))
    );
  }, [reduced, bounce, breathe, rise, scale, loop, breath]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: rise.get() + loop.get() }, { scale: scale.get() * breath.get() }],
  }));

  const image = (
    <Animated.View style={style}>
      <Image source={source} resizeMode="contain" style={{ width: Math.round(h * ratio), height: h }} />
    </Animated.View>
  );

  const side = Math.round(h * HALO_RATIO);

  return (
    <View
      style={[styles.wrap, halo && { width: side, height: side }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {halo ? <GoldHalo /> : null}
      {image}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
