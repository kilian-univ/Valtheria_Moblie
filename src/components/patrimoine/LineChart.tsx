import { memo, useEffect, useId, useLayoutEffect, useState } from 'react';
import { StyleSheet, useWindowDimensions, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, ClipPath, Defs, G, Line, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';

import AppText from '@/src/components/common/AppText';
import { fonts, palette, radius, withOpacity } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { select } from '@/src/utils/haptics';
import {
  areaPath,
  chartHeight,
  dayKey,
  extremes,
  linePath,
  makeScale,
  niceTicks,
  placeLabel,
  placeLabelScored,
  textWidth,
  type Box,
  type Pt,
  type Scale,
} from '@/src/utils/patrimoine/chart';

// value : hauteur du point (prix d'achat converti), sinon la valeur de la courbe
export type ChartDot = { index: number; color: string; letter?: string; value?: number };

// Ce qui se dessine (gardé pour le fondu d'une courbe à l'autre)
type Drawing = {
  values: (number | null)[];
  color: string;
  // Ligne pointillée de comparaison (montant investi), hors échelle ; son
  // étiquette dans une pastille qui évite la courbe, ou dans un coin si sa
  // dernière valeur sort de la plage affichée
  dashed?: number[] | null;
  dashedColor?: string;
  dashedLabel?: (v: number) => string;
  // Ligne horizontale pointillée, avec sa pastille (prix de revient, zéro)
  level?: { value: number; label?: string; color: string } | null;
  // Courbe d'une couleur au-dessus de `level`, d'une autre au-dessous
  signColors?: { above: string; below: string } | null;
  // Repères de valeur, courts (marge de droite)
  formatTick?: (v: number) => string;
  dots?: ChartDot[];
  area?: boolean;
  // Valeur écrite près du point le plus haut et le plus bas (sinon un point seul)
  extremeLabel?: (v: number) => string;
};

type Props = Drawing & {
  // Date de chaque point (ms) : vibration à chaque changement de jour
  times?: number[];
  // Date écrite au-dessus de la courbe pendant le glissement
  dateLabel?: (index: number) => string;
  // Point touché (null au relâcher) : l'écran met à jour son grand montant
  onScrub?: (index: number | null) => void;
  // Hauteur de la zone (sinon selon l'écran : 220 sur iPhone SE, 260 sur grand iPhone)
  height?: number;
  // Change avec la période ou le mode : passage animé d'une courbe à l'autre
  animateKey?: string;
  // Phrase qui résume la courbe pour le lecteur d'écran
  summary: string;
  // Appui long sur un point, sans bouger (supprimer un relevé)
  onLongPressPoint?: (index: number) => void;
};

// Marge de droite des repères, et marge horizontale intérieure des points
const GUTTER = 46;
const PAD_X = 7;
const TICK_FONT = 10;
const PILL_FONT = 10;
const PILL_H = 18;
const EXTREME_FONT = 10;
const DATE_FONT = 11;
// Appui long sur un point : plus long que le toucher qui affiche le point
const HOLD_MS = 550;
const FADE_MS = 300;

const firstValue = (values: (number | null)[]) => values.find((v): v is number => v !== null) ?? null;
// Empreinte des données : une nouvelle lecture de la même courbe ne s'anime pas
const signature = (d: Drawing) => {
  const n = d.values.length;
  return `${n}:${d.values[0]}:${d.values[n - 1]}:${d.dashed?.length ?? 0}:${d.level?.value ?? ''}`;
};

function frameOf(width: number, height: number, withTicks: boolean) {
  const zoneW = Math.max(1, width - (withTicks ? GUTTER : 0));
  return { zoneW, frame: { width: zoneW, height, padTop: 0, padBottom: 0, padX: PAD_X } };
}

function scaleOf(d: Drawing, width: number, height: number): { scale: Scale; zoneW: number } {
  const { zoneW, frame } = frameOf(width, height, !!d.formatTick);
  const numeric = d.values.filter((v): v is number => v !== null);
  return { scale: makeScale(numeric, d.values.length, frame), zoneW };
}

type Pill = { box: Box; text: string; inside: boolean };

// Mise en page d'une courbe : échelle, repères, extrêmes et pastilles des lignes
// de référence, placées une à une en évitant la courbe et les précédentes. Une
// pastille qu'aucune position n'éloigne de la courbe passe sous la zone (inside : false).
function layoutOf(d: Drawing, width: number, height: number) {
  const { scale, zoneW } = scaleOf(d, width, height);
  const { values } = d;
  const zone: Box = { x: 0, y: 0, w: zoneW, h: height };
  // Courbe en pixels (un point sur deux au-delà de 600, pour placer les étiquettes)
  const stepPts = values.length > 600 ? 2 : 1;
  const curve: Pt[] = [];
  values.forEach((v, i) => {
    if (v !== null && i % stepPts === 0) curve.push({ x: scale.x(i), y: scale.y(v) });
  });
  const obstacles: Box[] = [];
  const ext = extremes(values);
  const extremeBoxes: { index: number; box: Box | null; text: string | null }[] = [];
  if (ext) {
    for (const index of [ext.max, ext.min]) {
      const v = values[index] as number;
      const text = d.extremeLabel ? d.extremeLabel(v) : null;
      if (!text) {
        extremeBoxes.push({ index, box: null, text: null });
        continue;
      }
      const size = { w: textWidth(text, EXTREME_FONT), h: EXTREME_FONT + 4 };
      const x = scale.x(index);
      const y = scale.y(v);
      const above = index === ext.max;
      const candidates = [
        { x: x + 7, y: y - size.h / 2 },
        { x: x - 7 - size.w, y: y - size.h / 2 },
        { x: x - size.w / 2, y: above ? y - size.h - 5 : y + 5 },
        { x: x - size.w / 2, y: above ? y + 5 : y - size.h - 5 },
      ];
      const box = placeLabel(candidates, size, curve, zone, obstacles);
      obstacles.push(box);
      extremeBoxes.push({ index, box, text });
    }
  }
  // Pastille : sur sa ligne, ou juste au-dessus ou au-dessous (lineY : hauteur de
  // la ligne à une abscisse) ; hors de la plage, le long du bord concerné
  const pill = (text: string, lineY: ((x: number) => number) | null, edge: 'top' | 'bottom' | null): Pill => {
    const size = { w: textWidth(text, PILL_FONT) + 14, h: PILL_H };
    const candidates: Pt[] = [];
    for (let x = 0; x <= zoneW - size.w; x += 12) {
      if (lineY) {
        const y = lineY(x + size.w / 2);
        candidates.push({ x, y: y - size.h / 2 }, { x, y: y - size.h - 3 }, { x, y: y + 3 });
      } else candidates.push({ x, y: edge === 'top' ? 2 : height - size.h - 2 });
    }
    const { box, clear } = placeLabelScored(candidates, size, curve, zone, obstacles);
    const inside = clear >= 0;
    if (inside) obstacles.push(box);
    return { box, text, inside };
  };
  const edgeOf = (v: number) => (scale.contains(v) ? null : v > scale.max ? 'top' : 'bottom');
  const arrow = (edge: 'top' | 'bottom' | null) => (edge ? (edge === 'top' ? ' ↑' : ' ↓') : '');
  const levelEdge = d.level ? edgeOf(d.level.value) : null;
  const levelPill = d.level?.label ? pill(`${d.level.label}${arrow(levelEdge)}`, levelEdge ? null : () => scale.y(d.level!.value), levelEdge) : null;
  const dashedLast = d.dashed && d.dashed.length > 0 ? d.dashed[d.dashed.length - 1] : null;
  const dashedEdge = dashedLast !== null ? edgeOf(dashedLast) : null;
  const dashedPts = d.dashed;
  const dashedPill =
    dashedPts && dashedLast !== null && d.dashedLabel
      ? pill(`${d.dashedLabel(dashedLast)}${arrow(dashedEdge)}`, dashedEdge ? null : (x) => scale.y(dashedPts[scale.index(x)] ?? dashedLast), dashedEdge)
      : null;
  return { scale, zoneW, levelEdge, extremeBoxes, levelPill, dashedPill };
}

// Courbe dessinée : repères à droite, ligne de départ, lignes de référence et
// leurs pastilles, extrêmes de la période, points ; rien ne se pose sur la courbe
function ChartDrawing({ d, width, height, touched }: { d: Drawing; width: number; height: number; touched: number | null }) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const { scale, zoneW, levelEdge, extremeBoxes, levelPill, dashedPill } = layoutOf(d, width, height);
  const { values } = d;
  const allNumbers = values.every((v) => v !== null) ? (values as number[]) : null;
  const ticks = d.formatTick ? niceTicks(scale) : [];
  const start = firstValue(values);
  const lineColor = d.color;
  const zeroY = d.level ? Math.max(0, Math.min(height, scale.y(d.level.value))) : 0;
  const levelBox = levelPill?.inside ? levelPill.box : null;
  const levelText = levelPill?.inside ? levelPill.text : null;
  const dashedBox = dashedPill?.inside ? dashedPill.box : null;
  const dashedText = dashedPill?.inside ? dashedPill.text : null;
  const touchedValue = touched !== null ? values[touched] : null;
  const pillStyle = (stroke: string) => ({ fill: withOpacity(colors.background, 0.88), stroke: withOpacity(stroke, 0.6) });

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id={`fill${uid}`} x1="0" x2="0" y1="0" y2="1">
          <Stop offset="0" stopColor={lineColor} stopOpacity={0.28} />
          <Stop offset="1" stopColor={lineColor} stopOpacity={0} />
        </LinearGradient>
        {d.signColors && d.level ? (
          <>
            <ClipPath id={`above${uid}`}>
              <Rect x={0} y={0} width={zoneW} height={zeroY} />
            </ClipPath>
            <ClipPath id={`below${uid}`}>
              <Rect x={0} y={zeroY} width={zoneW} height={height - zeroY} />
            </ClipPath>
          </>
        ) : null}
      </Defs>
      {/* Repères de valeur : lignes discrètes dans la zone, valeur dans la marge de droite */}
      {ticks.map((t) => (
        <G key={`tick-${t}`}>
          <Line x1={0} x2={zoneW} y1={scale.y(t)} y2={scale.y(t)} stroke={withOpacity(colors.text, 0.06)} strokeWidth={1} />
          <SvgText x={zoneW + 6} y={scale.y(t) + TICK_FONT / 2 - 1} fontSize={TICK_FONT} fill={colors.subtitle} fontFamily={fonts.bodyMedium}>
            {d.formatTick!(t)}
          </SvgText>
        </G>
      ))}
      {d.area && allNumbers ? <Path d={areaPath(allNumbers, scale, height)} fill={`url(#fill${uid})`} /> : null}
      {/* Ligne de départ : la valeur du début de la période */}
      {start !== null ? (
        <Line x1={0} x2={zoneW} y1={scale.y(start)} y2={scale.y(start)} stroke={withOpacity(colors.text, 0.28)} strokeWidth={1} strokeDasharray="2 4" />
      ) : null}
      {d.level && !levelEdge ? (
        <Line x1={0} x2={zoneW} y1={scale.y(d.level.value)} y2={scale.y(d.level.value)} stroke={d.level.color} strokeWidth={1.5} strokeDasharray="5 4" />
      ) : null}
      {d.dashed ? <Path d={linePath(d.dashed, scale)} fill="none" stroke={d.dashedColor ?? colors.frostInk} strokeWidth={2} strokeDasharray="5 4" /> : null}
      {d.signColors && d.level ? (
        <>
          <Path d={linePath(values, scale)} fill="none" stroke={d.signColors.above} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" clipPath={`url(#above${uid})`} />
          <Path d={linePath(values, scale)} fill="none" stroke={d.signColors.below} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" clipPath={`url(#below${uid})`} />
        </>
      ) : (
        <Path d={linePath(values, scale)} fill="none" stroke={lineColor} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      )}
      {/* Pastilles des lignes de référence */}
      {levelBox && levelText && d.level ? (
        <G>
          <Rect x={levelBox.x} y={levelBox.y} width={levelBox.w} height={levelBox.h} rx={levelBox.h / 2} {...pillStyle(d.level.color)} strokeWidth={1} />
          <SvgText x={levelBox.x + 7} y={levelBox.y + PILL_H / 2 + PILL_FONT / 2 - 1.5} fontSize={PILL_FONT} fill={d.level.color} fontFamily={fonts.bodyMedium}>
            {levelText}
          </SvgText>
        </G>
      ) : null}
      {dashedBox && dashedText ? (
        <G>
          <Rect x={dashedBox.x} y={dashedBox.y} width={dashedBox.w} height={dashedBox.h} rx={dashedBox.h / 2} {...pillStyle(d.dashedColor ?? colors.frostInk)} strokeWidth={1} />
          <SvgText
            x={dashedBox.x + 7}
            y={dashedBox.y + PILL_H / 2 + PILL_FONT / 2 - 1.5}
            fontSize={PILL_FONT}
            fill={d.dashedColor ?? colors.frostInk}
            fontFamily={fonts.bodyMedium}
          >
            {dashedText}
          </SvgText>
        </G>
      ) : null}
      {(d.dots ?? []).map((dot, i) => {
        const v = dot.value ?? values[dot.index];
        if (v === null || v === undefined) return null;
        // Clé par rang : deux versements le même jour partagent un index
        return <Circle key={`dot-${i}`} cx={scale.x(dot.index)} cy={scale.y(v)} r={4.5} fill={dot.color} stroke={colors.background} strokeWidth={2} />;
      })}
      {/* Le plus haut et le plus bas de la période */}
      {extremeBoxes.map((e) => {
        const v = values[e.index] as number;
        return (
          <G key={`ext-${e.index}`}>
            <Circle cx={scale.x(e.index)} cy={scale.y(v)} r={3} fill={colors.text} stroke={colors.background} strokeWidth={1.5} />
            {e.box && e.text ? (
              <SvgText x={e.box.x} y={e.box.y + e.box.h - 3} fontSize={EXTREME_FONT} fill={colors.subtitle} fontFamily={fonts.bodyMedium}>
                {e.text}
              </SvgText>
            ) : null}
          </G>
        );
      })}
      {touched !== null && touchedValue !== null && touchedValue !== undefined ? (
        <>
          <Line x1={scale.x(touched)} x2={scale.x(touched)} y1={0} y2={height} stroke={withOpacity(colors.text, 0.4)} strokeWidth={1} />
          <Circle cx={scale.x(touched)} cy={scale.y(touchedValue)} r={5.5} fill={lineColor} stroke={colors.background} strokeWidth={2} />
        </>
      ) : null}
    </Svg>
  );
}

// Courbe avec toucher-glisser : trait vertical, point, date au-dessus ; l'écran
// met à jour son grand montant (onScrub). Vibration légère à chaque changement
// de jour. Changer de période ou de mode fond l'ancienne courbe dans la nouvelle
// (300 ms, sauf avec la réduction des animations). Le lecteur d'écran lit le résumé.
function LineChart({ times, dateLabel, onScrub, height: heightProp, animateKey, summary, onLongPressPoint, ...drawing }: Props) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const reduced = useReducedMotion();
  const screen = useWindowDimensions();
  const height = heightProp ?? chartHeight(screen.height);
  const [width, setWidth] = useState(0);
  const [touched, setTouched] = useState<number | null>(null);
  const [lastDay, setLastDay] = useState<string | null>(null);
  const { values } = drawing;
  const layout = layoutOf(drawing, Math.max(1, width), height);
  const { scale, zoneW } = layout;
  // Étiquettes de référence qu'aucune place n'éloigne de la courbe : sous la zone
  const below = [
    layout.levelPill && !layout.levelPill.inside && drawing.level ? { text: layout.levelPill.text, color: drawing.level.color } : null,
    layout.dashedPill && !layout.dashedPill.inside ? { text: layout.dashedPill.text, color: drawing.dashedColor ?? colors.frostInk } : null,
  ].filter((x): x is { text: string; color: string } => x !== null);

  // Passage d'une courbe à l'autre : l'ancienne gardée le temps du fondu
  const sig = signature(drawing);
  const [held, setHeld] = useState<{ key: string | undefined; sig: string; d: Drawing }>({ key: animateKey, sig, d: drawing });
  const [previous, setPrevious] = useState<Drawing | null>(null);
  if (held.key !== animateKey) {
    if (!reduced) setPrevious(held.d);
    setHeld({ key: animateKey, sig, d: drawing });
  } else if (held.sig !== sig) {
    setHeld({ key: animateKey, sig, d: drawing });
  }
  const progress = useSharedValue(1);
  useLayoutEffect(() => {
    if (!previous) return;
    progress.set(0);
    progress.set(withTiming(1, { duration: FADE_MS }));
  }, [previous, progress]);
  useEffect(() => {
    if (!previous) return;
    const t = setTimeout(() => setPrevious(null), FADE_MS + 20);
    return () => clearTimeout(t);
  }, [previous]);
  const currentStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
  const previousStyle = useAnimatedStyle(() => ({ opacity: 1 - progress.value }));

  const pick = (x: number) => {
    if (values.length === 0) return;
    const i = scale.index(x);
    if (i === touched) return;
    setTouched(i);
    onScrub?.(i);
    // Une vibration par jour franchi (par point si tous sont du même jour)
    const sameDay = !times || times.length < 2 || dayKey(times[0]) === dayKey(times[times.length - 1]);
    const key = times && !sameDay ? dayKey(times[i]) : String(i);
    if (key !== lastDay) {
      setLastDay(key);
      select();
    }
  };
  const release = () => {
    setTouched(null);
    setLastDay(null);
    onScrub?.(null);
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
  const date = touched !== null && dateLabel ? dateLabel(touched) : null;
  const dateW = date ? textWidth(date, DATE_FONT) + 16 : 0;
  const dateLeft = touched !== null ? Math.max(0, Math.min(zoneW - dateW, scale.x(touched) - dateW / 2)) : 0;

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={summary}>
      <GestureHandlerRootView>
        <GestureDetector gesture={gesture}>
          <View onLayout={onLayout} style={{ height }} collapsable={false}>
            {width > 0 && values.length > 0 ? (
              <>
                {previous ? (
                  <Animated.View style={[StyleSheet.absoluteFill, previousStyle]} pointerEvents="none">
                    <ChartDrawing d={previous} width={width} height={height} touched={null} />
                  </Animated.View>
                ) : null}
                <Animated.View style={[StyleSheet.absoluteFill, currentStyle]} pointerEvents="none">
                  <ChartDrawing d={drawing} width={width} height={height} touched={touched} />
                </Animated.View>
                {date ? (
                  <View
                    pointerEvents="none"
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                    style={[styles.date, { left: dateLeft, width: dateW, backgroundColor: colors.surfaceAlt, borderColor: withOpacity(colors.text, 0.1) }]}
                  >
                    <AppText numberOfLines={1} style={styles.dateText}>
                      {date}
                    </AppText>
                  </View>
                ) : null}
              </>
            ) : null}
          </View>
        </GestureDetector>
      </GestureHandlerRootView>
      {below.length > 0 && width > 0 ? (
        <View style={styles.below} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {below.map((b) => (
            <View key={b.text} style={styles.belowItem}>
              <View style={[styles.belowSwatch, { borderColor: b.color }]} />
              <AppText style={[styles.belowText, { color: b.color }]}>{b.text}</AppText>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  date: { position: 'absolute', top: 0, height: 22, borderRadius: radius.pill, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  dateText: { fontFamily: fonts.bodySemibold, fontSize: DATE_FONT },
  below: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 6 },
  belowItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  belowSwatch: { width: 16, borderTopWidth: 1.5, borderStyle: 'dashed' },
  belowText: { fontFamily: fonts.bodyMedium, fontSize: PILL_FONT },
});

// Mémorisé : redessiné seulement quand ses propriétés changent, pas à chaque
// rendu de l'écran qui le contient
export default memo(LineChart);
