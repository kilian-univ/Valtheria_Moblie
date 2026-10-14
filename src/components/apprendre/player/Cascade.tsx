import { ReactNode, useEffect } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { motion, timing } from '@/src/constants/motion';

// Montée par défaut (px)
const RISE = 8;

type CascadeProps = {
  // Rang dans la cascade : 40 ms de décalage par rang
  index: number;
  // Attente avant le premier rang (fin du passage d'écran)
  delay?: number;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  // Montée plus grande (bulle envoyée qui remonte)
  rise?: number;
};

// Un élément d'une cascade du lecteur : fondu et montée de 8 px en 250 ms
// (ease-out), décalé de 40 ms par rang. Animations réduites : affiché
// directement, sans cascade.
export default function Cascade({ index, delay = 0, children, style, rise: from = RISE }: CascadeProps) {
  const reduced = useReducedMotion();
  const opacity = useSharedValue(reduced ? 1 : 0);
  const rise = useSharedValue(reduced ? 0 : from);

  useEffect(() => {
    if (reduced) {
      opacity.set(1);
      rise.set(0);
      return;
    }
    const at = delay + index * motion.stagger;
    opacity.set(withDelay(at, withTiming(1, timing(motion.sheet))));
    rise.set(withDelay(at, withTiming(0, timing(motion.sheet))));
  }, [index, delay, reduced, opacity, rise]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.get(),
    transform: [{ translateY: rise.get() }],
  }));

  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
}
