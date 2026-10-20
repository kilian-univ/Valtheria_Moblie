import { memo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';

import AppText from '@/src/components/common/AppText';
import { fonts, palette } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { euros } from '@/src/utils/budget/format';
import type { CurvePoint } from '@/src/utils/budget/projection';

const HEIGHT = 120;
const PAD_TOP = 14;
const PAD_BOTTOM = 18;
const PAD_X = 5;

// « Ton solde ce mois-ci » (maquette, écran 4) : la courbe réelle jusqu'à
// aujourd'hui, en pointillés ensuite, avec le solde attendu en fin de mois.
// Dessin fixe, sans animation : rien à réduire.
function BalanceCurve({ points, end }: { points: CurvePoint[]; end: number }) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const values = points.map((p) => p.value);
  const min = Math.min(0, ...values);
  const max = Math.max(...values, 1);
  const days = Number(points[points.length - 1]?.day.slice(8) ?? 31);
  const x = (p: CurvePoint) => PAD_X + ((Number(p.day.slice(8)) - 1) / Math.max(1, days - 1)) * (width - PAD_X * 2);
  const y = (v: number) => PAD_TOP + (1 - (v - min) / (max - min || 1)) * (HEIGHT - PAD_TOP - PAD_BOTTOM);
  const real = points.filter((p) => !p.projected);
  const todayPoint = real[real.length - 1];
  const projected = todayPoint ? [todayPoint, ...points.filter((p) => p.projected)] : [];
  const line = (list: CurvePoint[]) => list.map((p) => `${x(p).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const zeroY = y(0);
  const summary = `Solde du mois : ${todayPoint ? `${euros(todayPoint.value)} aujourd’hui` : ''}, ${euros(end)} attendus en fin de mois.`;

  return (
    <View onLayout={onLayout} accessible accessibilityRole="image" accessibilityLabel={summary}>
      {width > 0 ? (
        <Svg width={width} height={HEIGHT}>
          <Line x1={0} x2={width} y1={zeroY} y2={zeroY} stroke={colors.controlBorder} strokeWidth={1} />
          {real.length > 1 ? <Polyline points={line(real)} fill="none" stroke={colors.gold} strokeWidth={2.5} strokeLinejoin="round" /> : null}
          {projected.length > 1 ? (
            <Polyline points={line(projected)} fill="none" stroke={colors.gold} strokeWidth={2} strokeDasharray="5 4" opacity={0.7} />
          ) : null}
          {todayPoint ? (
            <>
              <Circle cx={x(todayPoint)} cy={y(todayPoint.value)} r={5} fill={colors.gold} stroke={colors.background} strokeWidth={2} />
              <SvgText
                x={Math.min(x(todayPoint) + 8, width - 70)}
                y={Math.max(11, y(todayPoint.value) - 8)}
                fontSize={11}
                fill={colors.text}
                fontFamily={fonts.body}
              >
                aujourd’hui
              </SvgText>
            </>
          ) : null}
        </Svg>
      ) : (
        <View style={{ height: HEIGHT }} />
      )}
      <AppText variant="caption" tone="subtitle" style={styles.end}>
        fin de mois : {euros(end)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  end: { position: 'absolute', right: 0, bottom: 0 },
});

// Mémorisé : redessiné seulement quand ses propriétés changent, pas à chaque
// rendu de l'écran qui le contient
export default memo(BalanceCurve);
