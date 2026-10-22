import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  type SharedValue,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import AppText from '@/src/components/common/AppText';
import LiveText from '@/src/components/common/LiveText';
import { motion, timing } from '@/src/constants/motion';
import { fonts, palette, radius, space, titleLetterSpacing } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import {
  allocationAmount,
  allocationMax,
  allocationTemplateValues,
  fillTemplate,
  firstFailedRule,
  initialAllocation,
  moveAllocation,
} from '@/src/lesson/interactive';
import type { AllocateBucket, AllocateScreen as AllocateModel, ValLine } from '@/src/lesson/model';
import { formatNumber, withUnit } from '@/src/utils/format';
import { grade } from '@/src/utils/grade';
import { warning } from '@/src/utils/haptics';
import ScreenIntro from '../player/ScreenIntro';
import TrackSlider from '../player/TrackSlider';
import { LessonScreenProps } from '../types';

const PAY_BAR_HEIGHT = 40;
const SEGMENT_GAP = 2;
const DOT = 10;
const PERCENT_SIZE = 22;
// Pourcentage écrit dans un segment de la barre s'il a au moins cette largeur
const SEGMENT_TEXT_MIN = 40;
// Pot en cause après « Valider » : deux clignotements doux
const BLINKS = 2;
const BLINK_OPACITY = 0.35;
// Textes qui changent pendant le glissement : grandissement plafonné
const LIVE_MAX_SCALE = 1.3;

// Le gabarit « live » d'un pot (« Dans un an : {epargne_montant*12} € ») ne
// dépend-il que de ce pot ? Alors il se calcule d'avance, cran par cran.
export function liveDependsOnlyOn(template: string, key: string): boolean {
  const keys = [...template.matchAll(/\{(\w+)/g)].map((m) => m[1]);
  return keys.every((k) => k === key || k === `${key}_montant`);
}

// allocate — répartir un total fixe entre des pots, un curseur chacun. Le pot
// réservoir absorbe les changements des autres, sans passer sous zéro : le
// curseur bute alors (résistance et vibration d'avertissement). En haut, la
// paie découpée en segments qui bougent en direct. Valider : règles de la
// leçon (screen.rules) ; le pot en cause clignote, puis la feuille.
// Réponse : { clé du pot: valeur }.
// Pendant un glissement, AUCUN rendu React (lot 8) : la répartition vit dans
// une valeur partagée (fil d'interface) ; la barre de la paie, les
// pourcentages, les montants et « Dans un an » la suivent sans passer par
// React (textes calculés d'avance pour chaque cran). Au lâcher, React
// reprend la main avec la répartition exacte.
export default function AllocateScreen({ screen, answered, onDraftChange }: LessonScreenProps<AllocateModel>) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const { buckets, total, step, unit } = screen;
  // Répartition posée (au lâcher) : c'est elle qui part au lecteur
  const [values, setValues] = useState(() => initialAllocation(buckets));
  const [barWidth, setBarWidth] = useState(0);
  const reservoir = buckets.findIndex((b) => b.reservoir);

  // Répartition vivante, un nombre par pot, sur le fil d'interface
  const ui = useSharedValue(buckets.map((b) => values[b.key] ?? 0));
  useEffect(() => {
    ui.set(buckets.map((b) => values[b.key] ?? 0));
  }, [values, buckets, ui]);

  // Lâcher (ou lecteur d'écran) : la répartition exacte, posée par React
  const settle = (key: string, next: number) => {
    setValues((current) => moveAllocation(screen, current, key, next));
  };

  // Couleurs de la palette des graphiques, une par pot
  const inks = [colors.chart3, colors.chart4, colors.chart1, colors.chart2, colors.chart5];
  const inkOf = (i: number) => inks[i % inks.length];

  const percent = screen.base !== null;
  const amountText = (n: number) => withUnit(formatNumber(allocationAmount(screen, n)), screen.baseUnit);
  const templateValues = allocationTemplateValues(screen, values);
  // Verdict : grade.ts ; la première règle non respectée donne la réplique et le pot qui clignote
  const passed = grade(screen.source, values) === true;
  const failed = firstFailedRule(screen, values);

  // Textes de chaque cran (0, step, 2 × step… total), calculés une fois
  const crans = useMemo(() => {
    const list: number[] = [];
    for (let v = 0; v <= total + 1e-9; v += step > 0 ? step : 1) list.push(Math.round(v * 1000) / 1000);
    return list;
  }, [total, step]);
  const texts = useMemo(
    () => ({
      value: crans.map((v) => withUnit(formatNumber(v), unit)),
      amount: crans.map((v) => withUnit(formatNumber(allocationAmount(screen, v)), screen.baseUnit)),
      live: buckets.map((b) =>
        b.live && liveDependsOnlyOn(b.live, b.key)
          ? crans.map((v) => fillTemplate(b.live as string, allocationTemplateValues(screen, { [b.key]: v }), (n) => formatNumber(n)))
          : null
      ),
    }),
    [crans, unit, buckets, screen]
  );

  useEffect(() => {
    const correct = grade(screen.source, values) === true;
    const success = screen.val.correct;
    const val: ValLine | null = correct
      ? success && { ...success, line: fillTemplate(success.line, allocationTemplateValues(screen, values), (n) => formatNumber(n)) }
      : (firstFailedRule(screen, values)?.val ?? screen.val.wrong);
    onDraftChange({
      raw: values,
      correct,
      correctText: null,
      val,
      explanation: null,
      // Le pot en cause clignote avant la feuille
      sheetDelay: correct ? undefined : BLINKS * 2 * motion.state,
    });
  }, [values, screen, onDraftChange]);

  return (
    <View style={styles.wrap}>
      <ScreenIntro screen={screen} size="md" />

      <View style={styles.center}>
        {/* La paie (ou le total), découpée en un segment par pot */}
        <View
          accessible
          accessibilityLabel={`${percent ? 'Ta paie' : 'Total'} : ${buckets
            .map((b) => `${b.label} ${withUnit(formatNumber(values[b.key] ?? 0), unit)}`)
            .join(', ')}`}
        >
          <View style={styles.payHead}>
            <AppText variant="caption" tone="subtitle">
              {percent ? 'Ta paie' : 'Total'}
            </AppText>
            <AppText variant="caption" tone="subtitle" style={styles.tabular}>
              {percent ? amountText(total) : withUnit(formatNumber(total), unit)}
            </AppText>
          </View>
          <View style={[styles.payBar, { backgroundColor: colors.surface }]} onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}>
            {buckets.map((b, i) => (
              <Segment
                key={b.key}
                ui={ui}
                index={i}
                total={total}
                step={step}
                barWidth={barWidth}
                ink={inkOf(i)}
                textColor={colors.onGold}
                texts={texts.value}
                fallback={withUnit(formatNumber(values[b.key] ?? 0), unit)}
              />
            ))}
          </View>
        </View>

        <View style={styles.rows}>
          {buckets.map((b, i) => (
            <BucketRow
              key={b.key}
              bucket={b}
              index={i}
              ui={ui}
              step={step}
              ink={inkOf(i)}
              valueTexts={texts.value}
              amountTexts={percent ? texts.amount : null}
              liveTexts={texts.live[i]}
              valueText={withUnit(formatNumber(values[b.key] ?? 0), unit)}
              amount={percent ? amountText(values[b.key] ?? 0) : null}
              live={b.live ? fillTemplate(b.live, templateValues, (n) => formatNumber(n)) : null}
              blink={answered && !passed && failed?.bucket === b.key}
              reservoirIndex={reservoir}
              slider={{
                value: values[b.key] ?? 0,
                total,
                disabled: answered,
                limit: allocationMax(screen, values, b.key),
                onCommit: (next: number) => settle(b.key, next),
                accessibilityLabel: b.reservoir ? `${b.label}, s’ajuste quand tu bouges les autres` : b.label,
                formatValue: (n: number) =>
                  `${withUnit(formatNumber(n), unit)}${percent ? `, soit ${amountText(n)}` : ''}, au plus ${withUnit(
                    formatNumber(allocationMax(screen, values, b.key)),
                    unit
                  )}`,
              }}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

// Un segment de la barre de la paie : sa largeur et son texte suivent la
// répartition vivante sur le fil d'interface
function Segment({
  ui,
  index,
  total,
  step,
  barWidth,
  ink,
  textColor,
  texts,
  fallback,
}: {
  ui: SharedValue<number[]>;
  index: number;
  total: number;
  step: number;
  barWidth: number;
  ink: string;
  textColor: string;
  texts: readonly string[];
  fallback: string;
}) {
  const cran = useDerivedValue(() => ui.get()[index] / (step > 0 ? step : 1));
  const shape = useAnimatedStyle(() => {
    const all = ui.get();
    const share = all[index] / total;
    // Un filet de 2 px avant chaque segment visible, sauf le premier
    let before = false;
    for (let j = 0; j < index; j++) if (all[j] > 0) before = true;
    return { flex: share > 0 ? share : 0, marginLeft: share > 0 && before ? SEGMENT_GAP : 0 };
  });
  const label = useAnimatedStyle(() => ({ opacity: (ui.get()[index] / total) * barWidth >= SEGMENT_TEXT_MIN ? 1 : 0 }));
  return (
    <Animated.View style={[styles.segment, { backgroundColor: ink }, shape]}>
      <Animated.View style={label}>
        <LiveText
          texts={texts}
          index={cran}
          fallback={fallback}
          maxFontSizeMultiplier={1.2}
          style={[styles.segmentText, { color: textColor }]}
        />
      </Animated.View>
    </Animated.View>
  );
}

type SliderProps = {
  value: number;
  total: number;
  disabled: boolean;
  limit: number;
  onCommit: (next: number) => void;
  accessibilityLabel: string;
  formatValue: (n: number) => string;
};

type BucketRowProps = {
  bucket: AllocateBucket;
  index: number;
  // Rang du pot réservoir (-1 : aucun)
  reservoirIndex: number;
  ui: SharedValue<number[]>;
  step: number;
  ink: string;
  // Textes de chaque cran (pourcentage ou valeur, montant, « Dans un an »)
  valueTexts: readonly string[];
  amountTexts: readonly string[] | null;
  liveTexts: readonly string[] | null;
  // Textes au repos (posés par React)
  valueText: string;
  amount: string | null;
  live: string | null;
  // Règle non respectée après « Valider »
  blink: boolean;
  slider: SliderProps;
};

// Une ligne compacte : pastille de couleur, nom, montant en petit,
// pourcentage dans la couleur du pot, puis son curseur
function BucketRow({ bucket, index, reservoirIndex, ui, step, ink, valueTexts, amountTexts, liveTexts, valueText, amount, live, blink, slider }: BucketRowProps) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const reduced = useReducedMotion();
  const opacity = useSharedValue(1);
  const { label, reservoir } = bucket;
  // Valeur vivante du pot (fil d'interface) et son cran
  const current = useDerivedValue(() => ui.get()[index]);
  const cran = useDerivedValue(() => ui.get()[index] / (step > 0 ? step : 1));
  // Valeur écrite par le curseur de ce pot à chaque cran (fil d'interface) :
  // le réservoir absorbe la différence, la répartition vivante suit
  const dragged = useSharedValue(slider.value);
  useEffect(() => {
    dragged.set(slider.value);
  }, [slider.value, dragged]);
  useAnimatedReaction(
    () => dragged.get(),
    (next, previous) => {
      if (previous === null || reservoirIndex < 0 || index === reservoirIndex) return;
      const all = ui.get();
      const delta = next - all[index];
      if (delta === 0) return;
      const out = all.slice();
      out[index] = next;
      out[reservoirIndex] = all[reservoirIndex] - delta;
      ui.set(out);
    },
    [index, reservoirIndex]
  );

  useEffect(() => {
    if (!blink || reduced) return;
    opacity.set(
      withRepeat(withSequence(withTiming(BLINK_OPACITY, timing(motion.state)), withTiming(1, timing(motion.state))), BLINKS)
    );
  }, [blink, reduced, opacity]);

  const blinkStyle = useAnimatedStyle(() => ({ opacity: opacity.get() }));

  return (
    <Animated.View
      style={[
        styles.row,
        { backgroundColor: colors.panel, borderColor: blink ? colors.error : 'transparent' },
        blinkStyle,
      ]}
    >
      <View style={styles.rowHead}>
        <View style={styles.rowName}>
          <View style={[styles.dot, { backgroundColor: ink }]} />
          <AppText variant="bodyMedium" style={styles.name}>
            {label}
          </AppText>
          {amount !== null && amountTexts ? (
            <LiveText
              texts={amountTexts}
              index={cran}
              fallback={amount}
              maxFontSizeMultiplier={LIVE_MAX_SCALE}
              style={[styles.amount, { color: colors.subtitle }]}
            />
          ) : null}
          {/* La couleur n'est jamais le seul signal */}
          {blink ? <Ionicons name="alert-circle" size={18} color={colors.error} accessibilityLabel="Règle non respectée" /> : null}
        </View>
        <LiveText texts={valueTexts} index={cran} fallback={valueText} maxFontSizeMultiplier={LIVE_MAX_SCALE} style={[styles.percent, { color: ink }]} />
      </View>
      <TrackSlider
        size="md"
        color={ink}
        value={slider.value}
        min={0}
        max={slider.total}
        step={step}
        readOnly={reservoir}
        uiValue={reservoir ? current : dragged}
        disabled={slider.disabled}
        limit={slider.limit}
        onBlocked={warning}
        onCommit={slider.onCommit}
        accessibilityLabel={slider.accessibilityLabel}
        formatValue={slider.formatValue}
      />
      {reservoir ? (
        <AppText variant="caption" tone="subtitle">
          S’ajuste quand tu bouges les autres
        </AppText>
      ) : null}
      {live && liveTexts ? (
        <LiveText
          texts={liveTexts}
          index={cran}
          fallback={live}
          maxFontSizeMultiplier={LIVE_MAX_SCALE}
          style={[styles.live, styles.liveText, { color: colors.gold }]}
        />
      ) : live ? (
        // Gabarit qui dépend d'autres pots : suivi au lâcher seulement
        <AppText variant="callout" tone="gold" style={styles.live}>
          {live}
        </AppText>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    gap: space[5],
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    gap: space[4],
  },
  payHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: space[1] + 2,
  },
  payBar: {
    height: PAY_BAR_HEIGHT,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    overflow: 'hidden',
    flexDirection: 'row',
  },
  segment: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentText: {
    fontFamily: fonts.bodyExtraBold,
    fontSize: 12,
    lineHeight: 16,
    fontVariant: ['tabular-nums'],
  },
  rows: {
    gap: space[2] + 2,
  },
  row: {
    paddingHorizontal: space[4],
    paddingTop: space[2] + 2,
    paddingBottom: space[1] + 2,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    borderWidth: 1,
  },
  rowHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space[3],
  },
  rowName: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
  },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
  },
  name: {
    fontFamily: fonts.bodySemibold,
    flexShrink: 1,
  },
  percent: {
    fontFamily: fonts.title,
    fontSize: PERCENT_SIZE,
    // « 100 % » tient : le texte change sans nouvelle mise en page
    minWidth: 72,
    textAlign: 'right',
    letterSpacing: titleLetterSpacing(PERCENT_SIZE),
    fontVariant: ['tabular-nums'],
  },
  live: {
    fontFamily: fonts.bodyBold,
    marginTop: space[1],
  },
  // « Dans un an » suivi en direct (style « callout » d'AppText)
  liveText: {
    alignSelf: 'stretch',
    fontSize: 14,
  },
  // Montant du pot (style « caption » d'AppText)
  amount: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    minWidth: 64,
    fontVariant: ['tabular-nums'],
  },
  tabular: {
    fontVariant: ['tabular-nums'],
  },
});
