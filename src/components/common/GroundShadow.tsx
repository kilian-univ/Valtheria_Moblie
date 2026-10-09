import { useId } from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';

import { palette } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';

// Ombre au sol : ellipse noire floutée (dégradé radial), posée en absolu
export default function GroundShadow({
  width,
  height,
  opacity,
  left,
  top,
}: {
  width: number;
  height: number;
  opacity: number;
  left: number;
  top: number;
}) {
  const { colorScheme } = useTheme();
  const theme = palette[colorScheme];
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <Svg pointerEvents="none" width={width} height={height} style={[styles.abs, { left, top }]}>
      <Defs>
        <RadialGradient id={`gs${id}`} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={theme.groundShadow} stopOpacity={opacity} />
          <Stop offset="1" stopColor={theme.groundShadow} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Ellipse cx={width / 2} cy={height / 2} rx={width / 2} ry={height / 2} fill={`url(#gs${id})`} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  abs: {
    position: 'absolute',
  },
});
