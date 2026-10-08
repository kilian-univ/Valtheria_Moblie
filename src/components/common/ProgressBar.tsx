import { useEffect, useState } from 'react';
import { LayoutChangeEvent, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

import { counterEasing, durations } from '@/src/constants/motion';
import { palette, radius } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';

type ProgressBarProps = {
  // De 0 à 1, borné
  progress: number;
  height?: 4 | 6;
  tone?: 'gold' | 'muted';
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

// Barre de progression. Le remplissage part de 0 à l'apparition puis suit
// chaque changement, avec la courbe des compteurs.
// On anime la largeur (et non scaleX) : le remplissage est absolu et sans
// enfant, donc rien d'autre n'est remis en page, et l'arrondi reste net.
export default function ProgressBar({
  progress,
  height = 6,
  tone = 'gold',
  accessibilityLabel,
  style,
}: ProgressBarProps) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const reduced = useReducedMotion();

  const clamped = Math.min(1, Math.max(0, Number.isFinite(progress) ? progress : 0));
  const [trackWidth, setTrackWidth] = useState(0);
  const fillWidth = useSharedValue(0);

  useEffect(() => {
    if (trackWidth === 0) return;
    const target = clamped * trackWidth;
    fillWidth.set(reduced ? target : withTiming(target, { duration: durations.counter, easing: counterEasing }));
  }, [clamped, trackWidth, reduced, fillWidth]);

  const fillStyle = useAnimatedStyle(() => ({ width: fillWidth.get() }));

  const onLayout = (e: LayoutChangeEvent) => setTrackWidth(e.nativeEvent.layout.width);

  return (
    <View
      onLayout={onLayout}
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      style={[styles.track, { height, backgroundColor: colors.surface }, style]}
    >
      <Animated.View
        style={[
          styles.fill,
          { backgroundColor: tone === 'gold' ? colors.gold : colors.subtitle },
          fillStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  fill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    borderRadius: radius.pill,
  },
});
