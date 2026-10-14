import { useState } from 'react';
import { Platform, StyleProp, StyleSheet, TextStyle, View } from 'react-native';

import { fonts, titleLetterSpacing } from '@/src/constants/style/Style';
import { fitFontSize } from '@/src/utils/fit';
import AppText, { TextTone } from './AppText';

// Interligne du grand chiffre, proportionnel à sa taille
const LINE_RATIO = 1.08;
// Plus petit qu'un titre, il ne serait plus un grand chiffre
const MIN_SIZE = 28;

type BigNumberProps = {
  // Valeur avec son unité, déjà formatée (« 850 € »)
  text: string;
  // Taille voulue, réduite si le texte ne tient pas sur une ligne
  size: number;
  tone?: TextTone;
  style?: StyleProp<TextStyle>;
};

// Grand chiffre en Fraunces, toujours sur UNE ligne : la taille se réduit
// d'elle-même quand la largeur manque (« 300 000 € » sur iPhone SE).
// Décoratif pour le lecteur d'écran : le parent porte le libellé lu.
export default function BigNumber({ text, size, tone = 'gold', style }: BigNumberProps) {
  const [width, setWidth] = useState(0);
  const fontSize = fitFontSize(text, size, MIN_SIZE, width);

  return (
    <View style={styles.wrap} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <AppText
        tone={tone}
        numberOfLines={1}
        // Filet de sécurité natif (le web ne le connaît pas : le calcul suffit)
        adjustsFontSizeToFit={Platform.OS !== 'web'}
        maxFontSizeMultiplier={1}
        accessibilityElementsHidden
        importantForAccessibility="no"
        style={[
          styles.text,
          {
            fontSize,
            lineHeight: Math.round(fontSize * LINE_RATIO),
            letterSpacing: titleLetterSpacing(fontSize),
          },
          style,
        ]}
      >
        {/* Espace fine des milliers : absente de Fraunces sur le web, on
            prend l'insécable (même rendu partout) */}
        {text.replace(/\u202F/g, '\u00A0')}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'stretch',
  },
  text: {
    fontFamily: fonts.title,
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
});
