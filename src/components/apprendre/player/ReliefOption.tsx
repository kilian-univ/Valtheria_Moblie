import { Ionicons } from '@expo/vector-icons';
import { ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import AppText from '@/src/components/common/AppText';
import { springs } from '@/src/constants/motion';
import { palette, radius, reliefDepth, size, space } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';

const BORDER = 2;
const ICON = 24;
const BADGE = 34;
const BADGE_ICON = 17;
const SINK_DURATION = 80; // comme le bouton principal

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

// Réponse de QCM en relief : face posée sur une tranche, qui s'y enfonce à
// l'appui. Couleurs selon l'état (choisie, juste, fausse).
export default function ReliefOption({ label, state, selected, disabled, multiple, icon, badge, onPress }: ReliefOptionProps) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const reduced = useReducedMotion();
  const press = useSharedValue(0);

  const look = {
    idle: { border: colors.controlBorder, tint: 'transparent', edge: colors.reliefEdge },
    selected: { border: colors.gold, tint: colors.goldSoft, edge: colors.goldDeep },
    correct: { border: colors.success, tint: colors.successSoft, edge: colors.successDeep },
    wrong: { border: colors.error, tint: colors.dangerSoft, edge: colors.dangerDeep },
  }[state];

  const faceStyle = useAnimatedStyle(() => ({ transform: [{ translateY: press.get() * reliefDepth }] }));

  const handlePressIn = () => {
    press.set(reduced ? 1 : withTiming(1, { duration: SINK_DURATION }));
  };
  const handlePressOut = () => {
    press.set(reduced ? 0 : withSpring(0, springs.press));
  };

  return (
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
      {/* Face opaque (fond de l'écran) puis teinte : la tranche ne se voit
          jamais au travers d'une teinte transparente */}
      <Animated.View
        style={[styles.face, { backgroundColor: colors.background, borderColor: look.border }, faceStyle]}
      >
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
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingBottom: reliefDepth,
  },
  edge: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: reliefDepth,
    borderRadius: radius.option,
    borderCurve: 'continuous',
  },
  face: {
    minHeight: size.rowMin,
    borderRadius: radius.option,
    borderCurve: 'continuous',
    borderWidth: BORDER,
    paddingHorizontal: space[4],
    paddingVertical: space[3],
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
    flexShrink: 1,
  },
  badge: {
    width: BADGE,
    height: BADGE,
    borderRadius: BADGE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
