import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import AppText from '@/src/components/common/AppText';
import { fonts, palette, radius, space } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { useReliefPress } from '@/src/hooks/useReliefPress';

const SIZE = 84;
const DEPTH = 6;
const BORDER = 3;
const ICON = 34;

type RoundChoiceProps = {
  kind: 'true' | 'false';
  onPress: () => void;
  disabled?: boolean;
};

// Grand bouton rond en relief du vrai ou faux : croix rouge « Faux » ou
// coche verte « Vrai », le mot dessous (la couleur n'est jamais seule)
export default function RoundChoice({ kind, onPress, disabled }: RoundChoiceProps) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const { faceStyle, onPressIn, onPressOut } = useReliefPress(DEPTH);
  const truthy = kind === 'true';
  const ink = truthy ? colors.success : colors.error;
  const deep = truthy ? colors.successDeep : colors.dangerDeep;
  const label = truthy ? 'Vrai' : 'Faux';

  return (
    <Pressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={styles.wrap}
    >
      <View style={styles.relief}>
        <View style={[styles.round, styles.edge, { backgroundColor: deep }]} />
        <Animated.View style={[styles.round, styles.face, { backgroundColor: colors.surface, borderColor: ink }, faceStyle]}>
          <Ionicons name={truthy ? 'checkmark' : 'close'} size={ICON} color={ink} />
        </Animated.View>
      </View>
      <AppText style={[styles.label, { color: ink }]}>{label}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: space[2],
  },
  relief: {
    width: SIZE,
    height: SIZE + DEPTH,
  },
  round: {
    position: 'absolute',
    left: 0,
    width: SIZE,
    height: SIZE,
    borderRadius: radius.pill,
  },
  edge: {
    top: DEPTH,
  },
  face: {
    top: 0,
    borderWidth: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    lineHeight: 20,
  },
});
