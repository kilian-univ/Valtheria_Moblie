import { useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { palette } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';

// Le dégradé s'éteint avant le bord de la zone : aucun bord net, même si la
// zone est carrée.
const FADE_END = 0.9;

// Lueur dorée circulaire qui remplit son parent (position absolue).
// Règles d'usage :
// - le parent est carré et mesure au plus 1,5 fois l'élément entouré ;
// - aucun ancêtre en overflow hidden : le halo ne doit jamais être rogné ;
// - intensité au centre = goldHalo (0,15 au plus), jamais en pleine largeur.
// color : halo d'une autre couleur (couleur du module à 25 % sur le chemin).
export default function GoldHalo({ color }: { color?: string } = {}) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const center = color ?? colors.goldHalo;
  const id = `halo${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={StyleSheet.absoluteFill}
    >
      <Svg width="100%" height="100%">
        <Defs>
          <RadialGradient id={id} cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
            <Stop offset="0" stopColor={center} stopOpacity={1} />
            <Stop offset={FADE_END} stopColor={center} stopOpacity={0} />
            <Stop offset="1" stopColor={center} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}
