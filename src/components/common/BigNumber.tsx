import { useState } from 'react';
import { Platform, StyleProp, StyleSheet, TextStyle, View } from 'react-native';

import type { SharedValue } from 'react-native-reanimated';

import { fonts, palette, titleLetterSpacing } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { fitFontSize } from '@/src/utils/fit';
import AppText, { TextTone } from './AppText';
import LiveText from './LiveText';

// Interligne du grand chiffre, proportionnel à sa taille
const LINE_RATIO = 1.08;
// Plus petit qu'un titre, il ne serait plus un grand chiffre
const MIN_SIZE = 28;

type BigNumberProps = {
  // Valeur avec son unité, déjà formatée (« 850 € »)
  text: string;
  // Taille voulue, réduite si le texte ne tient pas sur une ligne
  size: number;
  // Texte sur lequel la taille se calcule, s'il varie en direct (pari,
  // simulateur, révélation) : la valeur la plus longue possible, unité
  // comprise (voir widestText). La taille reste alors fixe.
  sizingText?: string;
  tone?: TextTone;
  style?: StyleProp<TextStyle>;
};

// Grand chiffre en Fraunces, toujours sur UNE ligne : la taille se réduit
// d'elle-même quand la largeur manque (« 300 000 € » sur iPhone SE).
// Décoratif pour le lecteur d'écran : le parent porte le libellé lu.
export default function BigNumber({ text, size, sizingText, tone = 'gold', style }: BigNumberProps) {
  const [width, setWidth] = useState(0);
  const fontSize = fitFontSize(sizingText ?? text, size, MIN_SIZE, width);

  return (
    <View style={styles.wrap} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <AppText
        tone={tone}
        numberOfLines={1}
        // Filet de sécurité natif (le web ne le connaît pas : le calcul suffit)
        adjustsFontSizeToFit={Platform.OS !== 'web'}
        maxFontSizeMultiplier={1.2}
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

type LiveBigNumberProps = {
  // Textes d'avance, un par position, déjà formatés (« 120 846 € »)
  texts: readonly string[];
  index: SharedValue<number>;
  // Texte hors des bornes (au repos) et texte du premier affichage
  fallback: string;
  // Texte sur lequel la taille se calcule (le plus long possible)
  sizingText: string;
  size: number;
  tone?: TextTone;
  align?: 'center' | 'left';
};

// Grand chiffre qui change sans rendu React, pendant un glissement (curseur
// du simulateur, doigt sur une courbe) : même police, même taille fixe que
// BigNumber, texte posé par le fil d'interface (LiveText). Décoratif pour
// le lecteur d'écran.
export function LiveBigNumber({ texts, index, fallback, sizingText, size, tone = 'gold', align = 'center' }: LiveBigNumberProps) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const [width, setWidth] = useState(0);
  const fontSize = fitFontSize(sizingText, size, MIN_SIZE, width);
  const lineHeight = Math.round(fontSize * LINE_RATIO);
  // Fraunces n'a pas d'espace fine : l'insécable ordinaire (comme BigNumber)
  const fraunces = (t: string) => t.replace(/ /g, ' ');
  return (
    <View style={styles.wrap} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <LiveText
        texts={texts.map(fraunces)}
        index={index}
        fallback={fraunces(fallback)}
        style={[
          styles.text,
          {
            color: colors[tone],
            fontSize,
            height: lineHeight,
            letterSpacing: titleLetterSpacing(fontSize),
            textAlign: align,
          },
        ]}
      />
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
