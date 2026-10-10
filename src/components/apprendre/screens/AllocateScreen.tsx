import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import AppText from '@/src/components/common/AppText';
import { palette, radius, space } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import {
  allocationMax,
  fillTemplate,
  gradeAllocation,
  initialAllocation,
  moveAllocation,
} from '@/src/lesson/interactive';
import type { AllocateScreen as AllocateModel, ValLine } from '@/src/lesson/model';
import { formatNumber } from '@/src/utils/format';
import ScreenIntro from '../player/ScreenIntro';
import TrackSlider from '../player/TrackSlider';
import { LessonScreenProps } from '../types';

// allocate — répartir un total fixe entre des pots, un curseur chacun. Le pot
// réservoir absorbe les changements des autres, sans passer sous zéro.
// Valider : règles de la leçon (screen.rules), réplique de Val du cas.
// Réponse : { clé du pot: montant }.
export default function AllocateScreen({ screen, answered, onDraftChange }: LessonScreenProps<AllocateModel>) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const { buckets, total, step } = screen;
  const unit = screen.unit ?? '';
  const [values, setValues] = useState(() => initialAllocation(buckets));

  const withUnit = useMemo(() => (n: number) => `${formatNumber(n)}${unit ? ` ${unit}` : ''}`, [unit]);

  useEffect(() => {
    const { passed, failed } = gradeAllocation(screen, values);
    const success = screen.val.correct;
    const val: ValLine | null = passed
      ? success && { ...success, line: fillTemplate(success.line, values, (n) => formatNumber(n)) }
      : (failed?.val ?? screen.val.wrong);
    onDraftChange({ raw: values, correct: passed, correctText: null, val, explanation: null });
  }, [values, screen, onDraftChange]);

  return (
    <View style={styles.wrap}>
      <ScreenIntro screen={screen} />

      <View style={styles.buckets}>
        {buckets.map((b) => {
          const value = values[b.key] ?? 0;
          return (
            <View key={b.key} style={[styles.bucket, { backgroundColor: colors.surface, borderColor: colors.controlBorder }]}>
              <View style={styles.head}>
                <View style={styles.titles}>
                  <AppText variant="bodyMedium">{b.label}</AppText>
                  {b.hint ? (
                    <AppText variant="caption" tone="subtitle">
                      {b.hint}
                    </AppText>
                  ) : null}
                </View>
                <AppText variant="bodyMedium" tone="gold" style={styles.amount}>
                  {withUnit(value)}
                </AppText>
              </View>
              <TrackSlider
                value={value}
                min={0}
                max={total}
                step={step}
                readOnly={b.reservoir}
                disabled={answered}
                onChange={(next) => setValues((prev) => moveAllocation(screen, prev, b.key, next))}
                accessibilityLabel={b.reservoir ? `${b.label}, s’ajuste tout seul` : b.label}
                valueText={`${withUnit(value)}, au plus ${withUnit(allocationMax(screen, values, b.key))}`}
              />
              {b.reservoir ? (
                <AppText variant="caption" tone="subtitle">
                  S’ajuste tout seul
                </AppText>
              ) : null}
              {b.live ? (
                <AppText variant="callout" tone="gold" accessibilityLiveRegion="polite">
                  {fillTemplate(b.live, values, (n) => formatNumber(n))}
                </AppText>
              ) : null}
            </View>
          );
        })}
      </View>

      <AppText variant="caption" tone="subtitle" style={styles.center}>
        Total : {withUnit(total)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: space[6],
  },
  buckets: {
    gap: space[3],
  },
  bucket: {
    gap: space[1],
    padding: space[4],
    borderWidth: 1,
    borderRadius: radius.option,
    borderCurve: 'continuous',
  },
  head: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space[3],
  },
  titles: {
    flex: 1,
    gap: 2,
  },
  amount: {
    fontVariant: ['tabular-nums'],
  },
  center: {
    textAlign: 'center',
  },
});
