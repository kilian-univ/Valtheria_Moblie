import { Ionicons } from '@expo/vector-icons';
import { ComponentProps, useEffect, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import AppText from '@/src/components/common/AppText';
import { motion, timing } from '@/src/constants/motion';
import { fonts, palette, radius, reliefDepth, size, space } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { useReliefPress } from '@/src/hooks/useReliefPress';

const BORDER = 2;
// Tranche un peu plus épaisse que celle des boutons (cartes du lecteur)
const DEPTH = reliefDepth + 1;
const ICON = 24;
const VERDICT_ICON = 22;
const BADGE = 34;
const BADGE_ICON = 17;
const LABEL_SIZE = 17;
const LABEL_LINE_HEIGHT = 23;
// Bonne réponse : petite pulsation ; mauvaise : tremblement horizontal
const PULSE_SCALE = 1.03;
const SHAKE = 6;

export type OptionState = 'idle' | 'selected' | 'correct' | 'wrong';

type ReliefOptionProps = {
  label: string;
  state: OptionState;
  // Choisie par l'utilisateur (indépendant de la correction)
  selected: boolean;
  disabled?: boolean;
  multiple?: boolean;
  // Icône Ionicons à gauche du texte (objectifs, créneaux de rappel)
  icon?: ComponentProps<typeof Ionicons>['name'];
  // Icône posée dans une pastille ronde de cette couleur (objectifs : couleur
  // de l'univers), l'icône en iconColor
  badge?: { color: string; iconColor: string };
  onPress: () => void;
};

// Réponse en relief : face de carte posée sur une tranche, qui s'y enfonce à
// l'appui. Choisie : dorée. Corrigée : verte avec une coche et une petite
// pulsation, ou rouge avec une croix et un tremblement de 200 ms (la couleur
// n'est jamais le seul signal). Animations réduites : sans mouvement.
export default function ReliefOption({ label, state, selected, disabled, multiple, icon, badge, onPress }: ReliefOptionProps) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const reduced = useReducedMotion();
  const { faceStyle, onPressIn: handlePressIn, onPressOut: handlePressOut } = useReliefPress(DEPTH);

  const look = {
    idle: { border: colors.optionBorder, tint: 'transparent', edge: colors.optionEdge },
    selected: { border: colors.gold, tint: colors.goldSoft, edge: colors.goldDeep },
    correct: { border: colors.success, tint: colors.successSoft, edge: colors.successDeep },
    wrong: { border: colors.error, tint: colors.dangerSoft, edge: colors.dangerDeep },
  }[state];

  const pulse = useSharedValue(1);
  const shake = useSharedValue(0);
  const previous = useRef(state);
  useEffect(() => {
    if (state === previous.current) return;
    previous.current = state;
    if (reduced) return;
    if (state === 'correct') {
      pulse.set(withSequence(withTiming(PULSE_SCALE, timing(motion.state)), withTiming(1, timing(motion.state))));
    } else if (state === 'wrong') {
      const quarter = timing(motion.shake / 4);
      shake.set(
        withSequence(withTiming(SHAKE, quarter), withTiming(-SHAKE, quarter), withTiming(SHAKE / 2, quarter), withTiming(0, quarter))
      );
    }
  }, [state, reduced, pulse, shake]);

  const verdictStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shake.get() }, { scale: pulse.get() }],
  }));

  return (
    <Animated.View style={verdictStyle}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        accessibilityRole={multiple ? 'checkbox' : 'radio'}
        accessibilityLabel={label}
        accessibilityHint={state === 'correct' ? 'Bonne réponse' : state === 'wrong' ? 'Mauvaise réponse' : undefined}
        accessibilityState={{ checked: selected, disabled }}
        style={styles.wrap}
      >
        <View style={[styles.edge, { backgroundColor: look.edge }]} />
        {/* Face opaque puis teinte : la tranche ne se voit jamais au travers */}
        <Animated.View style={[styles.face, { backgroundColor: colors.optionFace, borderColor: look.border }, faceStyle]}>
          <View style={[styles.tint, { backgroundColor: look.tint }]} />
          <View style={styles.content}>
            {icon && badge ? (
              <View style={[styles.badge, { backgroundColor: badge.color }]}>
                <Ionicons name={icon} size={BADGE_ICON} color={badge.iconColor} />
              </View>
            ) : icon ? (
              <Ionicons name={icon} size={ICON} color={state === 'idle' ? colors.subtitle : look.border} />
            ) : null}
            <AppText variant="bodyMedium" style={styles.label}>
              {label}
            </AppText>
            {state === 'correct' || state === 'wrong' ? (
              <Ionicons
                name={state === 'correct' ? 'checkmark-circle' : 'close-circle'}
                size={VERDICT_ICON}
                color={look.border}
              />
            ) : null}
          </View>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingBottom: DEPTH,
  },
  edge: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: DEPTH,
    borderRadius: radius.card,
    borderCurve: 'continuous',
  },
  face: {
    minHeight: size.rowMin,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    borderWidth: BORDER,
    paddingHorizontal: space[4] + 2,
    paddingVertical: space[4],
    justifyContent: 'center',
    overflow: 'hidden',
  },
  tint: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3] + 2,
  },
  label: {
    flex: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: LABEL_SIZE,
    lineHeight: LABEL_LINE_HEIGHT,
  },
  badge: {
    width: BADGE,
    height: BADGE,
    borderRadius: BADGE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
