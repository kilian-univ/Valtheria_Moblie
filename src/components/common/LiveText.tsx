import { useState } from 'react';
import { Platform, type StyleProp, StyleSheet, TextInput, type TextStyle } from 'react-native';
import Animated, { type SharedValue, useAnimatedProps, useAnimatedReaction, useAnimatedStyle } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import Text from './Text';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

// Le web (outil de vérification, pas une cible de l'app) n'a pas de texte
// natif à poser : un texte ordinaire, mis à jour par la même valeur partagée
const WEB = Platform.OS === 'web';

type LiveTextProps = {
  // Textes calculés d'avance, un par position (cran d'un curseur, point d'une
  // courbe) : le fil d'interface n'a qu'à choisir le bon
  texts: readonly string[];
  // Position courante, lue sur le fil d'interface (arrondie). Hors des bornes
  // (par exemple -1 : aucun point touché) : le texte de repli
  index: SharedValue<number>;
  fallback?: string;
  // Couleur par position (facultatif) ; sinon celle du style
  colors?: readonly string[];
  fallbackColor?: string;
  style?: StyleProp<TextStyle>;
  // Grand texte : agrandissement maximal (aucun par défaut : la place est comptée)
  maxFontSizeMultiplier?: number;
};

// Texte qui change sans aucun rendu React : pendant un glissement, le fil
// d'interface (Reanimated) pose le texte de la position courante. Décoratif
// pour le lecteur d'écran : le parent porte le libellé lu, mis à jour au
// lâcher. Un champ de saisie non modifiable, seul composant dont Reanimated
// sait changer le texte directement.
export default function LiveText(props: LiveTextProps) {
  return WEB ? <WebLiveText {...props} /> : <NativeLiveText {...props} />;
}

function NativeLiveText({ texts, index, fallback = '', colors, fallbackColor, style, maxFontSizeMultiplier }: LiveTextProps) {
  const animatedProps = useAnimatedProps(() => {
    const i = Math.round(index.get());
    return { text: i >= 0 && i < texts.length ? texts[i] : fallback } as object;
  });
  const colorStyle = useAnimatedStyle(() => {
    if (!colors) return {};
    const i = Math.round(index.get());
    const color = i >= 0 && i < colors.length ? colors[i] : fallbackColor;
    return color ? { color } : {};
  });
  return (
    <AnimatedTextInput
      editable={false}
      pointerEvents="none"
      caretHidden
      contextMenuHidden
      scrollEnabled={false}
      underlineColorAndroid="transparent"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      allowFontScaling={maxFontSizeMultiplier !== undefined}
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      defaultValue={fallback}
      animatedProps={animatedProps}
      style={[styles.reset, style, colorStyle]}
    />
  );
}

// Web : même texte, posé par React (la vérification dans le navigateur)
function WebLiveText({ texts, index, fallback = '', colors, fallbackColor, style }: LiveTextProps) {
  const [shown, setShown] = useState({ text: fallback, color: fallbackColor });
  useAnimatedReaction(
    () => {
      const i = Math.round(index.get());
      const inside = i >= 0 && i < texts.length;
      return { text: inside ? texts[i] : fallback, color: colors ? (inside ? colors[i] : fallbackColor) : undefined };
    },
    (next, previous) => {
      if (previous && next.text === previous.text && next.color === previous.color) return;
      scheduleOnRN(setShown, next);
    },
    [texts, fallback, colors, fallbackColor]
  );
  return (
    <Text
      accessible={false}
      aria-hidden
      numberOfLines={1}
      style={[styles.reset, style, shown.color ? { color: shown.color } : null]}
    >
      {shown.text}
    </Text>
  );
}

const styles = StyleSheet.create({
  // Un champ de saisie a ses propres marges : on les retire
  reset: {
    padding: 0,
    margin: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
});
