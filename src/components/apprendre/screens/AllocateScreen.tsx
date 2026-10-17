import { Ionicons } from '@expo/vector-icons';
import { ReactNode, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import AppText from '@/src/components/common/AppText';
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
import type { AllocateScreen as AllocateModel, ValLine } from '@/src/lesson/model';
import { formatNumber, withUnit } from '@/src/utils/format';
import { grade } from '@/src/utils/grade';
import { createFrameBatch, type FrameBatch } from '@/src/utils/frameBatch';
import { warning } from '@/src/utils/haptics';
import ScreenIntro from '../player/ScreenIntro';
import TrackSlider from '../player/TrackSlider';
import { LessonScreenProps } from '../types';

const PAY_BAR_HEIGHT = 40;
const DOT = 10;
const PERCENT_SIZE = 22;
// Pourcentage écrit dans un segment de la barre s'il a au moins cette largeur
const SEGMENT_TEXT_MIN = 40;
// Pot en cause après « Valider » : deux clignotements doux
const BLINKS = 2;
const BLINK_OPACITY = 0.35;

// allocate — répartir un total fixe entre des pots, un curseur chacun. Le pot
// réservoir absorbe les changements des autres, sans passer sous zéro : le
// curseur bute alors (résistance et vibration d'avertissement). En haut, la
// paie découpée en segments qui bougent en direct. Valider : règles de la
// leçon (screen.rules) ; le pot en cause clignote, puis la feuille.
// Réponse : { clé du pot: valeur }.
export default function AllocateScreen({ screen, answered, onDraftChange }: LessonScreenProps<AllocateModel>) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const { buckets, total, step, unit } = screen;
  const [values, setValues] = useState(() => initialAllocation(buckets));
  // Répartition posée (au lâcher) : c'est elle qui part au lecteur
  const [settled, setSettled] = useState(values);
  const [barWidth, setBarWidth] = useState(0);

  // Pendant un glissement, la barre de la paie, les montants et « Dans un
  // an » suivent au plus une fois par image (dernière valeur de la rafale)
  const latest = useRef(values);
  const batch = useRef<FrameBatch<{ key: string; next: number }> | null>(null);
  const apply = ({ key, next }: { key: string; next: number }) => {
    const updated = moveAllocation(screen, latest.current, key, next);
    if (updated === latest.current) return;
    latest.current = updated;
    setValues(updated);
  };
  const move = (key: string, next: number) => {
    batch.current ??= createFrameBatch(apply, (run) => {
      requestAnimationFrame(run);
    });
    batch.current.push({ key, next });
  };
  // Lâcher : la valeur finale tout de suite, puis la répartition posée
  const settle = (key: string, next: number) => {
    move(key, next);
    batch.current?.flush();
    setSettled(latest.current);
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

  useEffect(() => {
    const correct = grade(screen.source, settled) === true;
    const success = screen.val.correct;
    const val: ValLine | null = correct
      ? success && { ...success, line: fillTemplate(success.line, allocationTemplateValues(screen, settled), (n) => formatNumber(n)) }
      : (firstFailedRule(screen, settled)?.val ?? screen.val.wrong);
    onDraftChange({
      raw: settled,
      correct,
      correctText: null,
      val,
      explanation: null,
      // Le pot en cause clignote avant la feuille
      sheetDelay: correct ? undefined : BLINKS * 2 * motion.state,
    });
  }, [settled, screen, onDraftChange]);

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
            {buckets.map((b, i) => {
              const share = (values[b.key] ?? 0) / total;
              if (share <= 0) return null;
              return (
                <View key={b.key} style={[styles.segment, { flex: share, backgroundColor: inkOf(i) }]}>
                  {share * barWidth >= SEGMENT_TEXT_MIN ? (
                    <AppText style={[styles.segmentText, { color: colors.onGold }]}>
                      {withUnit(formatNumber(values[b.key] ?? 0), unit)}
                    </AppText>
                  ) : null}
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.rows}>
          {buckets.map((b, i) => (
            <BucketRow
              key={b.key}
              label={b.label}
              ink={inkOf(i)}
              value={values[b.key] ?? 0}
              valueText={withUnit(formatNumber(values[b.key] ?? 0), unit)}
              amount={percent ? amountText(values[b.key] ?? 0) : null}
              live={b.live ? fillTemplate(b.live, templateValues, (n) => formatNumber(n)) : null}
              reservoir={b.reservoir}
              blink={answered && !passed && failed?.bucket === b.key}
            >
              <TrackSlider
                size="md"
                color={inkOf(i)}
                value={values[b.key] ?? 0}
                min={0}
                max={total}
                step={step}
                readOnly={b.reservoir}
                disabled={answered}
                limit={allocationMax(screen, values, b.key)}
                onBlocked={warning}
                onChange={(next) => move(b.key, next)}
                onCommit={(next) => settle(b.key, next)}
                accessibilityLabel={b.reservoir ? `${b.label}, s’ajuste quand tu bouges les autres` : b.label}
                valueText={`${withUnit(formatNumber(values[b.key] ?? 0), unit)}${
                  percent ? `, soit ${amountText(values[b.key] ?? 0)}` : ''
                }, au plus ${withUnit(formatNumber(allocationMax(screen, values, b.key)), unit)}`}
              />
            </BucketRow>
          ))}
        </View>
      </View>
    </View>
  );
}

type BucketRowProps = {
  label: string;
  ink: string;
  value: number;
  valueText: string;
  amount: string | null;
  live: string | null;
  reservoir: boolean;
  // Règle non respectée après « Valider »
  blink: boolean;
  children: ReactNode;
};

// Une ligne compacte : pastille de couleur, nom, montant en petit,
// pourcentage dans la couleur du pot, puis son curseur
function BucketRow({ label, ink, valueText, amount, live, reservoir, blink, children }: BucketRowProps) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const reduced = useReducedMotion();
  const opacity = useSharedValue(1);

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
          {amount ? (
            <AppText variant="caption" tone="subtitle" style={styles.tabular}>
              {amount}
            </AppText>
          ) : null}
          {/* La couleur n'est jamais le seul signal */}
          {blink ? <Ionicons name="alert-circle" size={18} color={colors.error} accessibilityLabel="Règle non respectée" /> : null}
        </View>
        <AppText maxFontSizeMultiplier={1.3} style={[styles.percent, { color: ink }]}>
          {valueText}
        </AppText>
      </View>
      {children}
      {reservoir ? (
        <AppText variant="caption" tone="subtitle">
          S’ajuste quand tu bouges les autres
        </AppText>
      ) : null}
      {live ? (
        <AppText variant="callout" tone="gold" style={styles.live} accessibilityLiveRegion="polite">
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
    gap: 2,
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
    lineHeight: PERCENT_SIZE + 6,
    letterSpacing: titleLetterSpacing(PERCENT_SIZE),
    fontVariant: ['tabular-nums'],
  },
  live: {
    fontFamily: fonts.bodyBold,
    marginTop: space[1],
  },
  tabular: {
    fontVariant: ['tabular-nums'],
  },
});
