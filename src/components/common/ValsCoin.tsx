import { Image, ImageSourcePropType, StyleProp, ImageStyle } from 'react-native';

// Pièce de Vals (fond transparent, recadrée sur le dessin). Trois tailles,
// chacune au moins 3 fois la taille affichée :
// - sm 96 px : pastilles de 18 à 32 px ;
// - md 144 px : gains, jusqu'à 48 px ;
// - lg 300 px : écran du coffre, jusqu'à 100 px.
const SOURCES: { max: number; source: ImageSourcePropType }[] = [
  { max: 32, source: require('@/assets/images/brand/coin-sm.webp') },
  { max: 48, source: require('@/assets/images/brand/coin-md.webp') },
  { max: Infinity, source: require('@/assets/images/brand/coin-lg.webp') },
];

type ValsCoinProps = {
  size: number;
  style?: StyleProp<ImageStyle>;
};

// Décorative : le chiffre à côté porte le libellé accessible (« 120 Vals »)
export default function ValsCoin({ size, style }: ValsCoinProps) {
  const { source } = SOURCES.find((s) => size <= s.max) ?? SOURCES[SOURCES.length - 1];
  return (
    <Image
      source={source}
      resizeMode="contain"
      style={[{ width: size, height: size }, style]}
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}
