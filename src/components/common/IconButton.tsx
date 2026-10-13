import { Ionicons } from '@expo/vector-icons';
import { ComponentProps, ReactNode } from 'react';
import { AccessibilityState, Insets, Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native';

import { palette, size as sizes } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';

export type IconName = ComponentProps<typeof Ionicons>['name'];

// ghost : transparent, rond plus clair à l'appui (retour, actions d'en-tête)
// filled : rond plein (surface), plus clair à l'appui (compte de l'accueil)
// plain : jamais de fond (croix du lecteur)
export type IconButtonVariant = 'ghost' | 'filled' | 'plain';

type IconButtonProps = {
  onPress: () => void;
  // Obligatoire : un bouton sans texte doit dire ce qu'il fait
  accessibilityLabel: string;
  icon?: IconName;
  iconSize?: number;
  // Couleur de l'icône (texte par défaut)
  color?: string;
  // Contenu à la place de l'icône (initiale du compte…)
  children?: ReactNode;
  variant?: IconButtonVariant;
  // Diamètre (zone de toucher de 44 par défaut)
  size?: number;
  accessibilityHint?: string;
  accessibilityState?: AccessibilityState;
  hitSlop?: number | Insets;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

// Bouton rond avec une icône : un seul modèle pour tous les boutons-icônes
export default function IconButton({
  onPress,
  accessibilityLabel,
  icon,
  iconSize = 24,
  color,
  children,
  variant = 'ghost',
  size = sizes.tapMin,
  accessibilityHint,
  accessibilityState,
  hitSlop,
  disabled,
  style,
}: IconButtonProps) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const rest = variant === 'filled' ? colors.surface : undefined;
  const pressedBg = variant === 'plain' ? undefined : colors.surface2;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={accessibilityState}
      hitSlop={hitSlop}
      style={({ pressed }) => [
        styles.button,
        { width: size, height: size, borderRadius: size / 2 },
        rest ? { backgroundColor: rest } : null,
        pressed && pressedBg ? { backgroundColor: pressedBg } : null,
        style,
      ]}
    >
      {children ?? (icon ? <Ionicons name={icon} size={iconSize} color={color ?? colors.text} /> : null)}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
