import { Ionicons } from '@expo/vector-icons';
import { ComponentProps, ReactNode, useEffect, useId } from 'react';
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
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';

import { durations, springs } from '@/src/constants/motion';
import { palette, withOpacity } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import Sheen from '@/src/components/common/Sheen';

type IconName = ComponentProps<typeof Ionicons>['name'];

export type NodeColors = { face: string; deep: string; icon: string };

const SHAKE_X = 5;
const SHAKE_MS = 50;
const POP_FROM = 0.8;
const GROW_TO = 1.15;
// Volume
const HIGHLIGHT_OPACITY = 0.35;
const HIGHLIGHT_REACH = 0.42; // le reflet s'éteint à 42 % du rond
const SHADE_OPACITY = 0.18;
const INNER_LIGHT = 2;
// Ombre portée au sol, sous la tranche
const GROUND_OPACITY = 0.45;
const GROUND_W_RATIO = 0.86;
const GROUND_H = 14;
// Petite ombre portée de l'icône ivoire
const ICON_SHADOW_OPACITY = 0.35;
const ICON_SHADOW_RADIUS = 2;

type PathNodeProps = {
  width: number;
  faceHeight: number;
  edge: number;
  // Rayon : absent = ovale ; un nombre = carré arrondi (cas pratique)
  cornerRadius?: number;
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
  // Derrière le rond (lueur du trophée, halo de la leçon en cours)
  behind?: ReactNode;
};

// Rond du chemin en relief : face sur sa tranche, avec du volume (reflet
// radial en haut à gauche, ombre radiale en bas à droite, fine lumière en
// haut) et une ombre portée au sol. À l'appui, la face descend sur sa
// tranche, qui disparaît.
export default function PathNode({
  width,
  faceHeight,
  edge,
  cornerRadius,
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
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');

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
      withDelay(litDelay, withSequence(withTiming(GROW_TO, { duration: durations.fade }), withSpring(1, springs.celebrate)))
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

  const pressIn = () => press.set(reduced ? 1 : withTiming(1, { duration: durations.sink }));
  const pressOut = () => press.set(reduced ? 0 : withSpring(0, springs.press));

  const shape = { borderRadius: cornerRadius ?? ('50%' as const) };
  const groundW = width * GROUND_W_RATIO;
  const iconShadow = {
    textShadowColor: withOpacity(colors.groundShadow, ICON_SHADOW_OPACITY),
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: ICON_SHADOW_RADIUS,
  };

  return (
    <Animated.View style={[{ width, height: faceHeight + edge }, wrapStyle]}>
      {behind}

      {/* Ombre portée au sol : ellipse floutée (dégradé radial), un peu plus
          étroite que le rond, sous la tranche */}
      <Svg
        pointerEvents="none"
        width={groundW}
        height={GROUND_H}
        style={[styles.ground, { left: (width - groundW) / 2, top: faceHeight + edge - GROUND_H / 2 }]}
      >
        <Defs>
          <RadialGradient id={`g${id}`} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={colors.groundShadow} stopOpacity={GROUND_OPACITY} />
            <Stop offset="1" stopColor={colors.groundShadow} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Ellipse cx={groundW / 2} cy={GROUND_H / 2} rx={groundW / 2} ry={GROUND_H / 2} fill={`url(#g${id})`} />
      </Svg>

      <Pressable
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        style={StyleSheet.absoluteFill}
      >
        <Animated.View style={[styles.layer, shape, { top: edge, width, height: faceHeight }, edgeStyle]} />
        <Animated.View
          style={[
            styles.layer,
            styles.face,
            shape,
            { width, height: faceHeight, borderTopColor: colors.nodeInnerLight },
            faceStyle,
          ]}
        >
          {/* Volume : reflet radial clair en haut à gauche, ombre en bas à droite */}
          <Sheen
            width={width}
            height={faceHeight}
            spots={[
              { cx: 0.78, cy: 0.82, r: 0.6, color: colors.nodeShade, opacity: SHADE_OPACITY },
              { cx: 0.3, cy: 0.26, r: HIGHLIGHT_REACH, color: colors.nodeHighlight, opacity: HIGHLIGHT_OPACITY },
            ]}
          />
          <View style={styles.icon}>
            <Animated.View style={[StyleSheet.absoluteFill, styles.center, offIconStyle]}>
              <Ionicons name={iconName} size={iconSize} color={off.icon} />
            </Animated.View>
            <Animated.View style={[StyleSheet.absoluteFill, styles.center, onIconStyle]}>
              <Ionicons name={iconName} size={iconSize} color={on.icon} style={iconShadow} />
            </Animated.View>
          </View>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  ground: {
    position: 'absolute',
  },
  layer: {
    position: 'absolute',
    left: 0,
  },
  face: {
    top: 0,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderTopWidth: INNER_LIGHT,
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
