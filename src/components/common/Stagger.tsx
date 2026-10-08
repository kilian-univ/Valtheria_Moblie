import { Children, isValidElement, ReactNode, useEffect } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { durations, springs, staggerDelay } from '@/src/constants/motion';

const RISE_DISTANCE = 8;

type StaggerProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

// Fait apparaître ses enfants l'un après l'autre (fondu + montée de 8 px),
// 90 ms d'écart, plafonné au 8e enfant. Animation au montage uniquement.
// À ne pas utiliser dans une FlatList : animer la liste entière à la place.
export default function Stagger({ children, style }: StaggerProps) {
  return (
    <View style={style}>
      {Children.toArray(children).map((child, index) => (
        <StaggerItem key={isValidElement(child) && child.key !== null ? child.key : index} index={index}>
          {child}
        </StaggerItem>
      ))}
    </View>
  );
}

function StaggerItem({ index, children }: { index: number; children: ReactNode }) {
  const reduced = useReducedMotion();
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(reduced ? 0 : RISE_DISTANCE);

  useEffect(() => {
    // Animations réduites : simple fondu, tous ensemble, sans déplacement
    const delay = reduced ? 0 : staggerDelay(index);
    opacity.set(withDelay(delay, withTiming(1, { duration: durations.enterOpacity })));
    if (!reduced) translateY.set(withDelay(delay, withSpring(0, springs.enter)));
  }, [index, reduced, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.get(),
    transform: [{ translateY: translateY.get() }],
  }));

  return <Animated.View style={animatedStyle}>{children}</Animated.View>;
}
