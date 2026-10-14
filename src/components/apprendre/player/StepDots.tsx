import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { palette, radius } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';

const DOT = 8;
const CURRENT_WIDTH = 22;
// Répondu : plus grand, avec une coche ou une croix (la couleur n'est
// jamais le seul signal)
const DONE = 14;
const DONE_ICON = 10;

// todo : à venir ; current : en cours (or, plus large) ; right / wrong :
// répondue (vert ou rouge)
export type StepState = 'todo' | 'current' | 'right' | 'wrong';

type StepDotsProps = {
  steps: StepState[];
  // Lu par le lecteur d'écran (« Carte 2 sur 4 »)
  accessibilityLabel: string;
};

// Points de progression au-dessus d'une pile de cartes ou de paires
export default function StepDots({ steps, accessibilityLabel }: StepDotsProps) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const fill: Record<StepState, string> = {
    todo: colors.surface,
    current: colors.gold,
    right: colors.success,
    wrong: colors.error,
  };

  return (
    <View style={styles.row} accessible accessibilityLabel={accessibilityLabel}>
      {steps.map((state, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            state === 'current' && styles.current,
            (state === 'right' || state === 'wrong') && styles.done,
            { backgroundColor: fill[state] },
          ]}
        >
          {state === 'right' || state === 'wrong' ? (
            <Ionicons name={state === 'right' ? 'checkmark' : 'close'} size={DONE_ICON} color={colors.onGold} />
          ) : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: radius.pill,
  },
  current: {
    width: CURRENT_WIDTH,
  },
  done: {
    width: DONE,
    height: DONE,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
