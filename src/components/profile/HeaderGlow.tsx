import { useId } from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { headerGlow, palette } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';

// Lueur dorée radiale très douce derrière l'en-tête du profil (or au cœur,
// éteinte au bord du cercle). Décorative.
export default function HeaderGlow({ top }: { top: number }) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const id = `hg${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const d = headerGlow.size;
  return (
    <Svg width={d} height={d} style={[styles.glow, { top, marginLeft: -d / 2 }]} pointerEvents="none">
      <Defs>
        <RadialGradient id={id} cx={d / 2} cy={d / 2} r={d / 2} gradientUnits="userSpaceOnUse">
          <Stop offset={0} stopColor={colors.gold} stopOpacity={headerGlow.opacity} />
          <Stop offset={0.65} stopColor={colors.gold} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect x={0} y={0} width={d} height={d} fill={`url(#${id})`} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  glow: {
    position: 'absolute',
    left: '50%',
  },
});
