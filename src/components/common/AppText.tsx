import { type TextProps } from 'react-native';

import { palette, TextVariantName, textVariants } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import Text from './Text';

// background : texte posé sur un aplat vert ou rouge (couleur du fond)
export type TextTone = 'text' | 'subtitle' | 'gold' | 'onGold' | 'success' | 'error' | 'background';

type AppTextProps = TextProps & {
  variant?: TextVariantName;
  tone?: TextTone;
};

// Texte de l'app : applique le style de la variante, son plafond
// d'agrandissement (maxFontSizeMultiplier) et une couleur de la palette.
// Les intitulés de section sont dorés par défaut, le reste en couleur texte.
// Espaces insécables posées à l'affichage (voir Text.tsx).
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
