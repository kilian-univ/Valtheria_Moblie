import { Ionicons } from '@expo/vector-icons';
import { ComponentProps } from 'react';
import { Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import AppText from '@/src/components/common/AppText';
import { fonts, palette, reliefDepth, space } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { useReliefPress } from '@/src/hooks/useReliefPress';
import { tap } from '@/src/utils/haptics';

const HEIGHT = 46;
const RADIUS = 14;
const PAD = 18;

type IvoryButtonProps = {
  label: string;
  // Libellé lu, s'il diffère du libellé affiché
  spokenLabel?: string;
  icon?: ComponentProps<typeof Ionicons>['name'];
  // Couleur du texte : la tranche de la carte colorée qui le porte
  color: string;
  onPress: () => void;
  // Toute la largeur de la carte, texte centré (sinon à la taille du texte)
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
};

// Bouton ivoire en relief, posé sur une carte colorée (grande carte de
// l'accueil, carte de l'objectif) : la face s'enfonce à l'appui
export default function IvoryButton({ label, spokenLabel, icon, color, onPress, fullWidth = false, style }: IvoryButtonProps) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const { faceStyle, onPressIn, onPressOut } = useReliefPress();

  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      accessibilityRole="button"
      accessibilityLabel={spokenLabel ?? label}
      style={[styles.button, fullWidth ? styles.full : styles.fit, style]}
    >
      <Animated.View style={[styles.edge, { backgroundColor: colors.cardEdge }]} />
      <Animated.View style={[styles.face, fullWidth && styles.faceFull, { backgroundColor: colors.ivory }, faceStyle]}>
        {icon ? <Ionicons name={icon} size={18} color={color} /> : null}
        <AppText maxFontSizeMultiplier={1.3} style={[styles.text, { color }]}>
          {label}
        </AppText>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingBottom: reliefDepth,
  },
  fit: {
    alignSelf: 'flex-start',
  },
  full: {
    alignSelf: 'stretch',
  },
  edge: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: reliefDepth,
    bottom: 0,
    borderRadius: RADIUS,
    borderCurve: 'continuous',
  },
  face: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    minHeight: HEIGHT,
    paddingHorizontal: PAD,
    borderRadius: RADIUS,
    borderCurve: 'continuous',
  },
  faceFull: {
    justifyContent: 'center',
  },
  text: {
    fontFamily: fonts.bodyExtraBold,
    fontSize: 15,
    lineHeight: 20,
    textAlign: 'center',
  },
});
