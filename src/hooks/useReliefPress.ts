import { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { durations, springs } from '@/src/constants/motion';
import { reliefDepth } from '@/src/constants/style/Style';

// Appui d'un élément en relief : la face s'enfonce dans sa tranche (80 ms),
// puis revient avec le ressort « press ». Animations réduites : immédiat.
// À brancher sur onPressIn / onPressOut, faceStyle sur la face animée.
export function useReliefPress(depth: number = reliefDepth) {
  const reduced = useReducedMotion();
  const press = useSharedValue(0);
  const faceStyle = useAnimatedStyle(() => ({ transform: [{ translateY: press.get() * depth }] }));
  return {
    press,
    faceStyle,
    onPressIn: () => press.set(reduced ? 1 : withTiming(1, { duration: durations.sink })),
    onPressOut: () => press.set(reduced ? 0 : withSpring(0, springs.press)),
  };
}
