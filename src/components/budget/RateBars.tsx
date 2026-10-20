import { memo, useState } from 'react';
import { LayoutChangeEvent, View } from 'react-native';
import Svg, { G, Line, Rect, Text as SvgText } from 'react-native-svg';

import { fonts, palette } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { monthName, monthShort } from '@/src/utils/budget/dates';
import { parseKey } from '@/src/utils/budget/flows';
import { NBSP } from '@/src/utils/frenchSpaces';

const HEIGHT = 132;
const BAR = 26;
const LABEL_Y = HEIGHT - 4;
// Hauteur réservée aux barres, de part et d'autre de la ligne du zéro
const TOP = 18;
const BOTTOM = 26;

// « Mai », « Juin », « Juil. », « Sept. »
function shortMonth(key: string): string {
  const short = monthShort(parseKey(key).month);
  return `${short.charAt(0).toUpperCase()}${short.slice(1)}`;
}

// Taux d'épargne des six derniers mois (maquette, écran 3) : barres dorées,
// rouges sous la ligne du zéro quand le mois a coûté plus qu'il n'a rapporté.
// Le mois affiché en plein, les autres atténués. Dessin fixe, sans animation.
function RateBars({ series, selected }: { series: { month: string; rate: number | null }[]; selected: string }) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const values = series.map((s) => (s.rate === null ? 0 : Math.round(s.rate * 100)));
  const max = Math.max(5, ...values);
  const min = Math.min(0, ...values);
  const span = HEIGHT - TOP - BOTTOM - 12;
  const unit = span / (max - min || 1);
  const zero = TOP + max * unit;
  const step = width / series.length;
  const summary = `Taux d’épargne des six derniers mois : ${series
    .map((s, i) => `${monthName(parseKey(s.month).month)} ${s.rate === null ? 'pas de chiffres' : `${values[i]} %`}`)
    .join(', ')}.`;

  return (
    <View onLayout={onLayout} accessible accessibilityRole="image" accessibilityLabel={summary} style={{ height: HEIGHT }}>
      {width > 0 ? (
        <Svg width={width} height={HEIGHT}>
          <Line x1={0} x2={width} y1={zero} y2={zero} stroke={colors.controlBorder} strokeWidth={1} />
          {series.map((s, i) => {
            const cx = step * i + step / 2;
            const v = values[i];
            const negative = v < 0;
            const color = negative ? colors.error : colors.gold;
            const h = Math.max(s.rate === null ? 0 : 2, Math.abs(v) * unit);
            const top = negative ? zero : zero - h;
            return (
              <G key={s.month}>
                {s.rate !== null ? (
                  <>
                    <Rect x={cx - BAR / 2} y={top} width={BAR} height={h} rx={4} fill={color} opacity={s.month === selected ? 1 : 0.55} />
                    <SvgText
                      x={cx}
                      y={negative ? top + h + 12 : top - 5}
                      textAnchor="middle"
                      fontSize={10}
                      fontFamily={fonts.bodyBold}
                      fill={color}
                    >
                      {`${negative ? '−' : ''}${Math.abs(v)}${NBSP}%`}
                    </SvgText>
                  </>
                ) : (
                  <SvgText x={cx} y={zero - 5} textAnchor="middle" fontSize={10} fontFamily={fonts.body} fill={colors.subtitle}>
                    —
                  </SvgText>
                )}
                <SvgText x={cx} y={LABEL_Y} textAnchor="middle" fontSize={11} fontFamily={fonts.body} fill={s.month === selected ? colors.text : colors.subtitle}>
                  {shortMonth(s.month)}
                </SvgText>
              </G>
            );
          })}
        </Svg>
      ) : null}
    </View>
  );
}

// Mémorisé : redessiné seulement quand ses propriétés changent, pas à chaque
// rendu de l'écran qui le contient
export default memo(RateBars);
