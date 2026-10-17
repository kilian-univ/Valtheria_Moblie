import { useId, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSharedValue } from 'react-native-reanimated';
import Svg, { Circle, ClipPath, Defs, G, Line, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';

import AppText from '@/src/components/common/AppText';
import { fonts, palette, radius, withOpacity } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { select } from '@/src/utils/haptics';
import { areaPath, linePath, makeScale, niceTicks } from '@/src/utils/patrimoine/chart';

// value : hauteur du point (prix d'achat converti), sinon la valeur de la courbe
export type ChartDot = { index: number; color: string; letter?: string; value?: number };
export type ChartTip = { title: string; caption?: string; extra?: string };

type Props = {
  values: (number | null)[];
  color: string;
  // Ligne pointillée de comparaison (montant investi), hors échelle ; son
  // étiquette en bordure quand sa dernière valeur sort de la plage affichée
  dashed?: number[] | null;
  dashedColor?: string;
  dashedLabel?: (v: number) => string;
  // Ligne horizontale pointillée, avec sa légende (prix de revient, zéro), hors
  // échelle : hors de la plage, une étiquette en bordure (« … ↓ »)
  level?: { value: number; label?: string; color: string } | null;
  // Courbe d'une couleur au-dessus de `level`, d'une autre au-dessous
  signColors?: { above: string; below: string } | null;
  // Échelle logarithmique (seulement si toutes les valeurs sont positives)
  log?: boolean;
  // Texte des repères de valeur (euros ou pourcentage)
  formatTick?: (v: number) => string;
  dots?: ChartDot[];
  area?: boolean;
  height?: number;
  // Étiquette du point touché
  tip: (index: number) => ChartTip;
  // Phrase qui résume la courbe pour le lecteur d'écran
  summary: string;
  // Appui long sur un point, sans bouger (supprimer un relevé)
  onLongPressPoint?: (index: number) => void;
};

const PAD_TOP = 14;
const PAD_BOTTOM = 14;
const TIP_WIDTH = 168;
// Appui long sur un point : plus long que le toucher qui affiche l'étiquette
const HOLD_MS = 550;

// Courbe avec toucher-glisser : trait vertical, point, étiquette au-dessus,
// vibration légère à chaque point franchi. Le lecteur d'écran lit le résumé.
export default function LineChart({ values, color, dashed, dashedColor, dashedLabel, level, signColors, log = false, formatTick, dots = [], area = true, height = 170, tip, summary, onLongPressPoint }: Props) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const [width, setWidth] = useState(0);
  const [touched, setTouched] = useState<number | null>(null);
  // Dernier point franchi pendant le glissement (une vibration par point)
  const last = useSharedValue<number | null>(null);

  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const numeric = values.filter((v): v is number => v !== null);
  // L'axe suit la seule courbe affichée : ni le prix de revient, ni le montant investi, ni zéro
  const scale = makeScale(numeric, values.length, { width: Math.max(1, width), height, padTop: PAD_TOP, padBottom: PAD_BOTTOM }, { log });
  const bottom = height - PAD_BOTTOM;
  // Repères de valeur, sauf celui qui tombe sur la ligne de niveau (elle a son étiquette)
  const ticks = formatTick ? niceTicks(scale).filter((t) => !level || Math.abs(scale.y(t) - scale.y(level.value)) > 8) : [];
  // Ligne hors de la plage : étiquette en haut (↑) ou en bas (↓) de la courbe
  const edge = (v: number) => (scale.contains(v) ? null : v > scale.max ? 'top' : 'bottom');
  const levelEdge = level ? edge(level.value) : null;
  const dashedLast = dashed && dashed.length > 0 ? dashed[dashed.length - 1] : null;
  const dashedEdge = dashedLast !== null && dashedLabel ? edge(dashedLast) : null;
  const zeroY = level ? Math.max(0, Math.min(height, scale.y(level.value))) : 0;

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
  const hold = Gesture.LongPress()
    .runOnJS(true)
    .enabled(!!onLongPressPoint)
    .minDuration(HOLD_MS)
    .maxDistance(10)
    .onStart((e) => {
      if (values.length === 0 || !onLongPressPoint) return;
      const i = scale.index(e.x);
      release();
      onLongPressPoint(i);
    });
  const gesture = Gesture.Simultaneous(pan, press, hold);

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
                  <LinearGradient id={`chartFill${uid}`} x1="0" x2="0" y1="0" y2="1">
                    <Stop offset="0" stopColor={color} stopOpacity={0.3} />
                    <Stop offset="1" stopColor={color} stopOpacity={0} />
                  </LinearGradient>
                </Defs>
                {signColors && level ? (
                  <Defs>
                    <ClipPath id={`above${uid}`}>
                      <Rect x={0} y={0} width={width} height={zeroY} />
                    </ClipPath>
                    <ClipPath id={`below${uid}`}>
                      <Rect x={0} y={zeroY} width={width} height={height - zeroY} />
                    </ClipPath>
                  </Defs>
                ) : null}
                {/* Repères de valeur, discrets, à gauche */}
                {ticks.map((t) => (
                  <G key={`tick-${t}`}>
                    <Line x1={0} x2={width} y1={scale.y(t)} y2={scale.y(t)} stroke={withOpacity(colors.text, 0.07)} strokeWidth={1} />
                    <SvgText x={2} y={scale.y(t) - 4} fontSize={10} fill={colors.subtitle} fontFamily={fonts.bodyMedium}>
                      {formatTick!(t)}
                    </SvgText>
                  </G>
                ))}
                {area && allNumbers ? <Path d={areaPath(allNumbers, scale, bottom)} fill={`url(#chartFill${uid})`} /> : null}
                {level && !levelEdge ? (
                  <>
                    <Line x1={0} x2={width} y1={scale.y(level.value)} y2={scale.y(level.value)} stroke={level.color} strokeWidth={1.5} strokeDasharray="5 4" />
                    {level.label ? (
                      <SvgText x={width - 4} y={Math.max(12, scale.y(level.value) - 6)} textAnchor="end" fontSize={11} fill={level.color} fontFamily={fonts.bodyMedium}>
                        {level.label}
                      </SvgText>
                    ) : null}
                  </>
                ) : null}
                {level && levelEdge && level.label ? (
                  <SvgText x={width - 4} y={levelEdge === 'top' ? 10 : height - 3} textAnchor="end" fontSize={11} fill={level.color} fontFamily={fonts.bodyMedium}>
                    {`${level.label} ${levelEdge === 'top' ? '↑' : '↓'}`}
                  </SvgText>
                ) : null}
                {dashed ? <Path d={linePath(dashed, scale)} fill="none" stroke={dashedColor ?? colors.frostInk} strokeWidth={2} strokeDasharray="5 4" /> : null}
                {dashedEdge && dashedLast !== null && dashedLabel ? (
                  <SvgText
                    x={width - 4}
                    y={dashedEdge === 'top' ? 10 : height - 3}
                    textAnchor="end"
                    fontSize={11}
                    fill={dashedColor ?? colors.frostInk}
                    fontFamily={fonts.bodyMedium}
                  >
                    {`${dashedLabel(dashedLast)} ${dashedEdge === 'top' ? '↑' : '↓'}`}
                  </SvgText>
                ) : null}
                {signColors && level ? (
                  <>
                    <Path d={linePath(values, scale)} fill="none" stroke={signColors.above} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" clipPath={`url(#above${uid})`} />
                    <Path d={linePath(values, scale)} fill="none" stroke={signColors.below} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" clipPath={`url(#below${uid})`} />
                  </>
                ) : (
                  <Path d={linePath(values, scale)} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
                )}
                {dots.map((d) => {
                  const v = d.value ?? values[d.index];
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
