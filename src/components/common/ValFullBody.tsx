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
}: ValFullBodyProps) {
  const reduced = useReducedMotion();
  const excess = useContext(ValFitContext);
  const { height: windowHeight } = useWindowDimensions();
  const h = excess === null ? windowFitHeight(height, minHeight, windowHeight) : fitHeight(height, minHeight, excess);
  const { source, ratio } = POSES[pose];

  const rise = useSharedValue(reduced ? 0 : RISE);
  const scale = useSharedValue(reduced ? 1 : FROM_SCALE);
  const loop = useSharedValue(0);

  useEffect(() => {
    if (reduced) return;
    rise.set(withSpring(0, springs.celebrate));
    scale.set(withSpring(1, springs.celebrate));
    if (!bounce) return;
    const half = { duration: BOUNCE_PERIOD / 2, easing: Easing.inOut(Easing.sin) };
    loop.set(
      withDelay(BOUNCE_START, withRepeat(withSequence(withTiming(-BOUNCE_HEIGHT, half), withTiming(0, half)), -1))
    );
  }, [reduced, bounce, rise, scale, loop]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: rise.get() + loop.get() }, { scale: scale.get() }],
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
