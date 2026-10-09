import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { durations, springs } from '@/src/constants/motion';
import { palette, radius, reliefDepth, size } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';

const SIDE = 56;
const SINK_MS = 80;

type JumpButtonProps = {
  // La leçon en cours est au-dessus ou en dessous de l'écran
  direction: 'up' | 'down';
  onPress: () => void;
};

// Bouton flottant qui ramène à la leçon en cours quand elle sort de l'écran
export default function JumpButton({ direction, onPress }: JumpButtonProps) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const reduced = useReducedMotion();
  const press = useSharedValue(0);
  const faceStyle = useAnimatedStyle(() => ({ transform: [{ translateY: press.get() * reliefDepth }] }));

  return (
    <Animated.View
      entering={reduced ? undefined : FadeIn.duration(durations.fade)}
      exiting={reduced ? undefined : FadeOut.duration(durations.fade)}
    >
      <Pressable
        onPress={onPress}
        onPressIn={() => press.set(reduced ? 1 : withTiming(1, { duration: SINK_MS }))}
        onPressOut={() => press.set(reduced ? 0 : withSpring(0, springs.press))}
        accessibilityRole="button"
        accessibilityLabel="Aller à la leçon en cours"
        style={styles.wrap}
      >
        <View style={[styles.edge, { backgroundColor: colors.pathLockedDeep }]} />
        <Animated.View
          style={[styles.face, { backgroundColor: colors.surface, borderColor: colors.controlBorder }, faceStyle]}
        >
          <Ionicons name={direction === 'up' ? 'arrow-up' : 'arrow-down'} size={size.icon} color={colors.text} />
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: SIDE,
    height: SIDE + reliefDepth,
  },
  edge: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: reliefDepth,
    borderRadius: radius.md,
  },
  face: {
    width: SIDE,
    height: SIDE,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
