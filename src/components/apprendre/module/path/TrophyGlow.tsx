import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import GoldHalo from '@/src/components/common/GoldHalo';
import { durations } from '@/src/constants/motion';
import { TROPHY_H, TROPHY_W } from '@/src/utils/modulePath';

// Carré de la lueur : au plus 1,5 fois le trophée
export const GLOW_SIZE = Math.round(TROPHY_W * 1.45);
const PULSE_LOW = 0.55;
const PULSE_PERIOD = 1800;

// Lueur dorée qui pulse derrière le trophée d'un module terminé.
// Animations réduites : lueur fixe.
export default function TrophyGlow({ appearDelay }: { appearDelay?: number }) {
  const reduced = useReducedMotion();
  const opacity = useSharedValue(appearDelay === undefined || reduced ? 1 : 0);

  useEffect(() => {
    if (reduced) {
      opacity.set(1);
      return;
    }
    if (appearDelay !== undefined) opacity.set(0);
    const half = { duration: PULSE_PERIOD / 2, easing: Easing.inOut(Easing.sin) };
    const pulse = withRepeat(withSequence(withTiming(PULSE_LOW, half), withTiming(1, half)), -1);
    opacity.set(
      appearDelay === undefined
        ? pulse
        : withDelay(appearDelay, withSequence(withTiming(1, { duration: durations.enterOpacity }), pulse))
    );
  }, [reduced, appearDelay, opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.get() }));

  return (
    <Animated.View pointerEvents="none" style={[styles.glow, style]}>
      <GoldHalo />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  glow: {
    position: 'absolute',
    width: GLOW_SIZE,
    height: GLOW_SIZE,
    left: (TROPHY_W - GLOW_SIZE) / 2,
    top: (TROPHY_H - GLOW_SIZE) / 2,
  },
});
