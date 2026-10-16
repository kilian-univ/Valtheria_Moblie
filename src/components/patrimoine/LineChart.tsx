import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSharedValue } from 'react-native-reanimated';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';

import AppText from '@/src/components/common/AppText';
import { fonts, palette, radius, withOpacity } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { select } from '@/src/utils/haptics';
import { areaPath, linePath, makeScale } from '@/src/utils/patrimoine/chart';

export type ChartDot = { index: number; color: string; letter?: string };
export type ChartTip = { title: string; caption?: string; extra?: string };

type Props = {
  values: (number | null)[];
  color: string;
  // Ligne pointillée de comparaison (montant investi)
  dashed?: number[] | null;
  dashedColor?: string;
  // Ligne horizontale pointillée, avec sa légende (prix de revient, zéro)
  level?: { value: number; label?: string; color: string } | null;
  dots?: ChartDot[];
  area?: boolean;
  height?: number;
  // Étiquette du point touché
  tip: (index: number) => ChartTip;
  // Phrase qui résume la courbe pour le lecteur d'écran
  summary: string;
};

const PAD_TOP = 10;
const PAD_BOTTOM = 10;
const TIP_WIDTH = 168;

// Courbe avec toucher-glisser : trait vertical, point, étiquette au-dessus,
// vibration légère à chaque point franchi. Le lecteur d'écran lit le résumé.
export default function LineChart({ values, color, dashed, dashedColor, level, dots = [], area = true, height = 170, tip, summary }: Props) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const [width, setWidth] = useState(0);
  const [touched, setTouched] = useState<number | null>(null);
  // Dernier point franchi pendant le glissement (une vibration par point)
  const last = useSharedValue<number | null>(null);

  const numeric = values.filter((v): v is number => v !== null);
  const extra = [...(dashed ?? []), ...(level ? [level.value] : [])];
  const scale = makeScale(numeric, values.length, { width: Math.max(1, width), height, padTop: PAD_TOP, padBottom: PAD_BOTTOM }, extra);
  const bottom = height - PAD_BOTTOM;

  const pick = (x: number) => {
    if (values.length === 0) return;
    const i = scale.index(x);
    if (i !== last.get()) {
      last.set(i);
      select();
      setTouched(i);
    }
  };
  const release = () => {
    last.set(null);
    setTouched(null);
  };

  const pan = Gesture.Pan()
    .runOnJS(true)
    .activeOffsetX([-6, 6])
    .failOffsetY([-14, 14])
    .onStart((e) => pick(e.x))
    .onUpdate((e) => pick(e.x))
    .onFinalize(release);
  const press = Gesture.LongPress()
    .runOnJS(true)
    .minDuration(120)
    .maxDistance(4000)
    .onStart((e) => pick(e.x))
    .onFinalize(release);
  const gesture = Gesture.Simultaneous(pan, press);

  const onLayout = (e: LayoutChangeEvent) => setWidth(Math.round(e.nativeEvent.layout.width));
  const allNumbers = values.every((v) => v !== null) ? (values as number[]) : null;

  const tipInfo = touched !== null ? tip(touched) : null;
  const tipX = touched !== null ? scale.x(touched) : 0;
  const tipLeft = Math.max(0, Math.min(width - TIP_WIDTH, tipX - TIP_WIDTH / 2));
  const touchedValue = touched !== null ? values[touched] : null;

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={summary}>
      <View style={styles.tipSlot}>
        {tipInfo ? (
          <View
            style={[styles.tip, { left: tipLeft, width: TIP_WIDTH, backgroundColor: colors.surfaceAlt, borderColor: withOpacity(colors.text, 0.1) }]}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            <AppText numberOfLines={1} style={styles.tipTitle}>
              {tipInfo.title}
              {tipInfo.caption ? <AppText style={[styles.tipCaption, { color: colors.subtitle }]}>{`  ·  ${tipInfo.caption}`}</AppText> : null}
            </AppText>
            {tipInfo.extra ? (
              <AppText numberOfLines={1} style={[styles.tipCaption, { color: dashedColor ?? colors.frostInk }]}>
                {tipInfo.extra}
              </AppText>
            ) : null}
          </View>
        ) : null}
      </View>
      <GestureHandlerRootView>
        <GestureDetector gesture={gesture}>
          <View onLayout={onLayout} style={{ height }} collapsable={false}>
            {width > 0 && values.length > 0 ? (
              <Svg width={width} height={height}>
                <Defs>
                  <LinearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1">
                    <Stop offset="0" stopColor={color} stopOpacity={0.3} />
                    <Stop offset="1" stopColor={color} stopOpacity={0} />
                  </LinearGradient>
                </Defs>
                {area && allNumbers ? <Path d={areaPath(allNumbers, scale, bottom)} fill="url(#chartFill)" /> : null}
                {level ? (
                  <>
                    <Line x1={0} x2={width} y1={scale.y(level.value)} y2={scale.y(level.value)} stroke={level.color} strokeWidth={1.5} strokeDasharray="5 4" />
                    {level.label ? (
                      <SvgText x={width - 4} y={Math.max(12, scale.y(level.value) - 6)} textAnchor="end" fontSize={11} fill={level.color} fontFamily={fonts.bodyMedium}>
                        {level.label}
                      </SvgText>
                    ) : null}
                  </>
                ) : null}
                {dashed ? <Path d={linePath(dashed, scale)} fill="none" stroke={dashedColor ?? colors.frostInk} strokeWidth={2} strokeDasharray="5 4" /> : null}
                <Path d={linePath(values, scale)} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
                {dots.map((d) => {
                  const v = values[d.index];
                  if (v === null || v === undefined) return null;
                  return (
                    <Circle key={`${d.index}-${d.color}`} cx={scale.x(d.index)} cy={scale.y(v)} r={5} fill={d.color} stroke={colors.background} strokeWidth={2} />
                  );
                })}
                {touched !== null && touchedValue !== null && touchedValue !== undefined ? (
                  <>
                    <Line x1={tipX} x2={tipX} y1={0} y2={bottom} stroke={withOpacity(colors.text, 0.35)} strokeWidth={1} strokeDasharray="3 3" />
                    <Circle cx={tipX} cy={scale.y(touchedValue)} r={6} fill={color} stroke={colors.background} strokeWidth={2} />
                  </>
                ) : null}
              </Svg>
            ) : null}
          </View>
        </GestureDetector>
      </GestureHandlerRootView>
    </View>
  );
}

const styles = StyleSheet.create({
  tipSlot: { height: 44 },
  tip: {
    position: 'absolute',
    top: 0,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  tipTitle: { fontFamily: fonts.bodyBold, fontSize: 14 },
  tipCaption: { fontFamily: fonts.bodyMedium, fontSize: 12 },
});
