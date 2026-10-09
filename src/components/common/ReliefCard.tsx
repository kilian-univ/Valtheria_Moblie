import { ReactNode } from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { palette, space, withOpacity } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';

const RADIUS = 18;
const EDGE = 6;
const BORDER_OPACITY = 0.28;

type ReliefCardProps = {
  children: ReactNode;
  // Carte entière touchable : la face s'enfonce à l'appui
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
};

// Carte en relief : face surface, fine bordure dorée (28 %), tranche
// surfaceEdge de 6 dessous, coins de 18, marge interne de 16. Mot du jour,
// « Teste-toi ».
export default function ReliefCard({ children, onPress, accessibilityLabel, accessibilityHint, style }: ReliefCardProps) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];

  const body = (pressed: boolean) => (
    <>
      <View style={[styles.edge, { backgroundColor: colors.surfaceEdge }]} />
      <View
        style={[
          styles.face,
          {
            backgroundColor: colors.surface,
            borderColor: withOpacity(colors.gold, BORDER_OPACITY),
            transform: [{ translateY: pressed ? EDGE / 2 : 0 }],
          },
        ]}
      >
        {children}
      </View>
    </>
  );

  if (!onPress) return <View style={[styles.wrap, style]}>{body(false)}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      style={[styles.wrap, style]}
    >
      {({ pressed }) => body(pressed)}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingBottom: EDGE,
  },
  edge: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: EDGE,
    borderRadius: RADIUS,
    borderCurve: 'continuous',
  },
  face: {
    borderRadius: RADIUS,
    borderCurve: 'continuous',
    borderWidth: 1,
    padding: space[4],
    gap: space[2],
  },
});
