import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, useReducedMotion } from 'react-native-reanimated';

import { durations } from '@/src/constants/motion';
import { palette, radius, reliefDepth, size } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { useReliefPress } from '@/src/hooks/useReliefPress';

const SIDE = 56;

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
  const { faceStyle, onPressIn, onPressOut } = useReliefPress();

  return (
    <Animated.View
      entering={reduced ? undefined : FadeIn.duration(durations.fade)}
      exiting={reduced ? undefined : FadeOut.duration(durations.fade)}
    >
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
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
