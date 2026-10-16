import { useId } from 'react';
import { Image, PixelRatio, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { DECOR_IMAGES } from '@/src/constants/decorImages';
import { palette, universeArt as ART } from '@/src/constants/style/Style';
import { UNIVERSE_IMAGES } from '@/src/constants/universeImages';
import { useTheme } from '@/src/context/ThemeContext';
import { universeArt } from '@/src/utils/universes';

// Taille de la petite version des illustrations (-sm), en pixels
const SMALL_PX = 256;

type UniverseArtProps = {
  slug: string;
  // Couleur de l'univers (face de moduleColors)
  color: string;
  // Largeur ; la hauteur vaut la largeur sauf si `height` est donnée
  size: number;
  height?: number;
  // Cadre sombre arrondi sous le halo ; sans cadre, le halo est posé sur le fond
  framed?: boolean;
  // Rayon du cadre (par défaut : 21 % de la taille ; 0 dans une carte qui rogne)
  radius?: number;
  style?: StyleProp<ViewStyle>;
};

// Illustration peinte d'un univers posée sur un halo radial doux de sa
// couleur. Sans illustration (univers inconnu) : son décor peint. Décorative :
// ignorée par le lecteur d'écran.
export default function UniverseArt({ slug, color, size, height, framed = false, radius, style }: UniverseArtProps) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const id = `art${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const h = height ?? size;
  const image = Math.round(Math.min(size, h) * ART.imageScale);
  const ref = universeArt(slug);
  const source =
    ref.kind === 'art'
      ? image * PixelRatio.get() <= SMALL_PX
        ? UNIVERSE_IMAGES[ref.name].small
        : UNIVERSE_IMAGES[ref.name].large
      : DECOR_IMAGES[ref.name];
  // Le décor peint n'a pas de marge : un peu plus petit que l'illustration
  const shown = ref.kind === 'art' ? image : Math.round(image * 0.82);

  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.box,
        { width: size, height: h },
        framed && {
          backgroundColor: colors.artFrame,
          borderRadius: radius ?? Math.round(Math.min(size, h) * ART.frameRadius),
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Svg width={size} height={h} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id={id} cx="50%" cy={`${ART.haloY * 100}%`} r="50%" fx="50%" fy={`${ART.haloY * 100}%`}>
            <Stop offset="0" stopColor={color} stopOpacity={ART.haloCenter} />
            <Stop offset={ART.haloMidAt} stopColor={color} stopOpacity={ART.haloMid} />
            <Stop offset={ART.fade} stopColor={color} stopOpacity={0} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width={size} height={h} fill={`url(#${id})`} />
      </Svg>
      <Image source={source} resizeMode="contain" style={{ width: shown, height: shown }} accessibilityIgnoresInvertColors />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    justifyContent: 'center',
    borderCurve: 'continuous',
  },
});
