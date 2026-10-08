import { Text, TextProps } from 'react-native';

import { palette, TextVariantName, textVariants } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';

export type TextTone = 'text' | 'subtitle' | 'gold' | 'onGold' | 'success' | 'error';

type AppTextProps = TextProps & {
  variant?: TextVariantName;
  tone?: TextTone;
};

// Texte de l'app : applique le style de la variante, son plafond
// d'agrandissement (maxFontSizeMultiplier) et une couleur de la palette.
// Les intitulés de section sont dorés par défaut, le reste en couleur texte.
export default function AppText({ variant = 'body', tone, style, ...props }: AppTextProps) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const resolvedTone: TextTone = tone ?? (variant === 'sectionLabel' ? 'gold' : 'text');
  const { style: variantStyle, maxFontSizeMultiplier } = textVariants[variant];

  return (
    <Text
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      {...props}
      style={[variantStyle, { color: colors[resolvedTone] }, style]}
    />
  );
}
