import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { DimensionValue, LayoutChangeEvent, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { durations } from '@/src/constants/motion';
import { palette, radius as radii } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';

type SkeletonProps = {
  width: DimensionValue;
  height: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
};

// Bloc de chargement : la forme du contenu à venir, avec un reflet qui balaie
// de gauche à droite. Sans reflet si l'utilisateur réduit les animations.
export default function Skeleton({ width, height, radius = radii.sm, style }: SkeletonProps) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const reduced = useReducedMotion();

  const [blockWidth, setBlockWidth] = useState(0);
  const translateX = useSharedValue(0);

  useEffect(() => {
    if (reduced || blockWidth === 0) return;
    translateX.set(
      withRepeat(
        withSequence(
          withTiming(-blockWidth, { duration: 0 }),
          withTiming(blockWidth, { duration: durations.shimmer, easing: Easing.linear })
        ),
        -1
      )
    );
    return () => cancelAnimation(translateX);
  }, [reduced, blockWidth, translateX]);

  const shineStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.get() }],
  }));

  const onLayout = (e: LayoutChangeEvent) => setBlockWidth(e.nativeEvent.layout.width);

  return (
    <View
      onLayout={onLayout}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.block,
        { width, height, borderRadius: radius, backgroundColor: colors.surface },
        style,
      ]}
    >
      {!reduced && blockWidth > 0 ? (
        <Animated.View style={[StyleSheet.absoluteFill, shineStyle]}>
          <LinearGradient
            colors={['transparent', colors.skeletonShine, 'transparent']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      ) : null}
    </View>
  );
}

// Renvoie true seulement si le chargement dure plus de 300 ms : un chargement
// rapide n'affiche jamais de squelette (pas de clignotement).
export function useDelayedLoading(isLoading: boolean): boolean {
  const [delayPassed, setDelayPassed] = useState(false);

  useEffect(() => {
    if (!isLoading) return;
    const timer = setTimeout(() => setDelayPassed(true), durations.skeletonDelay);
    return () => {
      clearTimeout(timer);
      setDelayPassed(false);
    };
  }, [isLoading]);

  return isLoading && delayPassed;
}

const styles = StyleSheet.create({
  block: {
    overflow: 'hidden',
    borderCurve: 'continuous',
  },
});
