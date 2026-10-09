import { Ionicons } from '@expo/vector-icons';
import { ComponentProps, ReactNode, useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { durations, springs } from '@/src/constants/motion';
import { palette } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';

type IconName = ComponentProps<typeof Ionicons>['name'];

export type NodeColors = { face: string; deep: string; icon: string };

const SINK_DURATION = 80; // comme le bouton principal
const SHINE_W = 24;
const SHINE_H = 10;
const SHAKE_X = 5;
const SHAKE_MS = 50;
const POP_FROM = 0.8;
const GROW_TO = 1.15;

type PathNodeProps = {
  width: number;
  faceHeight: number;
  edge: number;
  iconName: IconName;
  iconSize: number;
  // Couleurs allumées (terminé, en cours, trophée doré) et éteintes (verrouillé)
  on: NodeColors;
  off: NodeColors;
  lit: boolean;
  // Allumage animé (déverrouillage) : de « off » à « on », après ce délai (ms).
  // Absent : allumé ou éteint tout de suite.
  litDelay?: number;
  // Incrémenter pour faire trembler (toucher sur verrouillé, déverrouillage)
  shakeSignal?: number;
  // Incrémenter pour un éclat (leçon tout juste réussie)
  popSignal?: number;
  onPress: () => void;
  accessibilityLabel: string;
  accessibilityHint?: string;
  // Derrière le rond (lueur du trophée)
  behind?: ReactNode;
};

// Rond du chemin en relief : face ovale sur sa tranche, reflet clair en haut
// à gauche. À l'appui, la face descend sur sa tranche, qui disparaît.
export default function PathNode({
  width,
  faceHeight,
  edge,
  iconName,
  iconSize,
  on,
  off,
  lit,
  litDelay,
  shakeSignal = 0,
  popSignal = 0,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  behind,
}: PathNodeProps) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const reduced = useReducedMotion();

  const press = useSharedValue(0);
  const shake = useSharedValue(0);
  const scale = useSharedValue(1);
  // 0 = éteint, 1 = allumé
  const tint = useSharedValue(lit && litDelay === undefined ? 1 : 0);

  useEffect(() => {
    if (!lit) {
      tint.set(0);
      return;
    }
    if (litDelay === undefined || reduced) {
      tint.set(1);
      return;
    }
    // Déverrouillage : le rond grossit à 1,15 puis revient en prenant la couleur
    // (il a pu s'allumer en arrière-plan : on repart de l'état éteint)
    tint.set(0);
    tint.set(withDelay(litDelay, withTiming(1, { duration: durations.enterOpacity })));
    scale.set(
      withDelay(
        litDelay,
        withSequence(withTiming(GROW_TO, { duration: durations.fade }), withSpring(1, springs.celebrate))
      )
    );
  }, [lit, litDelay, reduced, tint, scale]);

  useEffect(() => {
    if (shakeSignal === 0 || reduced) return;
    shake.set(
      withSequence(
        withTiming(-SHAKE_X, { duration: SHAKE_MS }),
        withTiming(SHAKE_X, { duration: SHAKE_MS * 2 }),
        withTiming(-SHAKE_X / 2, { duration: SHAKE_MS * 1.5 }),
        withTiming(0, { duration: SHAKE_MS })
      )
    );
  }, [shakeSignal, reduced, shake]);

  useEffect(() => {
    if (popSignal === 0 || reduced) return;
    scale.set(POP_FROM);
    scale.set(withSpring(1, springs.celebrate));
  }, [popSignal, reduced, scale]);

  const wrapStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shake.get() }, { scale: scale.get() }],
  }));
  const edgeStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(tint.get(), [0, 1], [off.deep, on.deep]),
  }));
  const faceStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(tint.get(), [0, 1], [off.face, on.face]),
    transform: [{ translateY: press.get() * edge }],
  }));
  const onIconStyle = useAnimatedStyle(() => ({ opacity: tint.get() }));
  const offIconStyle = useAnimatedStyle(() => ({ opacity: 1 - tint.get() }));

  const pressIn = () => press.set(reduced ? 1 : withTiming(1, { duration: SINK_DURATION }));
  const pressOut = () => press.set(reduced ? 0 : withSpring(0, springs.press));

  return (
    <Animated.View style={[{ width, height: faceHeight + edge }, wrapStyle]}>
      {behind}
      <Pressable
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        style={StyleSheet.absoluteFill}
      >
        <Animated.View style={[styles.oval, { top: edge, width, height: faceHeight }, edgeStyle]} />
        <Animated.View style={[styles.oval, styles.face, { width, height: faceHeight }, faceStyle]}>
          <View style={[styles.shine, { backgroundColor: colors.pathShine }]} />
          <View style={styles.icon}>
            <Animated.View style={[StyleSheet.absoluteFill, styles.center, offIconStyle]}>
              <Ionicons name={iconName} size={iconSize} color={off.icon} />
            </Animated.View>
            <Animated.View style={[StyleSheet.absoluteFill, styles.center, onIconStyle]}>
              <Ionicons name={iconName} size={iconSize} color={on.icon} />
            </Animated.View>
          </View>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  oval: {
    position: 'absolute',
    left: 0,
    borderRadius: '50%',
  },
  face: {
    top: 0,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  shine: {
    position: 'absolute',
    top: '14%',
    left: '18%',
    width: SHINE_W,
    height: SHINE_H,
    borderRadius: SHINE_H / 2,
    transform: [{ rotate: '-20deg' }],
  },
  icon: {
    width: '100%',
    height: '100%',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
