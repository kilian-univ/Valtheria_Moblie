import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import AppText from '@/src/components/common/AppText';
import BigNumber from '@/src/components/common/BigNumber';
import { motion } from '@/src/constants/motion';
import { fonts, palette, radius, space } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { useRollingNumber } from '@/src/hooks/useRollingNumber';
import { computeFormula, formulaSeries, seriesScale } from '@/src/lesson/formulas';
import { rangeLine } from '@/src/lesson/interactive';
import type { SimulatorOutput, SimulatorScreen as SimulatorModel } from '@/src/lesson/model';
import { formatNumber, withUnit } from '@/src/utils/format';
import ScreenIntro from '../player/ScreenIntro';
import SimChart from '../player/SimChart';
import TrackSlider from '../player/TrackSlider';
import { LessonScreenProps } from '../types';

const BIG_SIZE = 56;
const LEGEND_LINE = 14;

// Résultat arrondi à l'unité, avec son unité
function outputText(output: SimulatorOutput, value: number): string {
  return withUnit(formatNumber(Math.round(value), 0), output.unit);
}

// simulator — un curseur, et des résultats calculés en direct par la formule
// de la leçon (lesson/formulas.ts) : le gros chiffre défile, une petite
// courbe montre l'argent qui grossit sur la durée (redessinée en 300 ms).
// Val change de phrase quand on change de tranche. Non noté : « Continuer »
// s'active dès que le curseur a bougé (voir canContinue).
export default function SimulatorScreen({ screen, onDraftChange, setVal, enterDelay }: LessonScreenProps<SimulatorModel>) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const { min, max, step, formula, params, outputs, ranges, unit } = screen;
  const [value, setValue] = useState(screen.start);
  const [moved, setMoved] = useState(false);

  const results = computeFormula(formula, value, params);
  const series = formulaSeries(formula, value, params);
  const scale = useMemo(() => seriesScale(formula, min, max, params), [formula, min, max, params]);
  const val = rangeLine(ranges, value);
  const big = outputs.find((o) => o.big) ?? outputs[0];
  const others = outputs.filter((o) => o !== big);
  const rolling = useRollingNumber(results[big.key] ?? 0);
  const sliderText = withUnit(formatNumber(value), unit);

  useEffect(() => {
    if (moved) onDraftChange({ raw: value, correct: true, correctText: null });
  }, [moved, value, onDraftChange]);

  // Val (en haut de l'écran) change de phrase quand on change de tranche
  const valText = val?.line ?? null;
  const valMood = val?.mood ?? null;
  useEffect(() => {
    if (moved && valText && valMood) setVal({ line: valText, mood: valMood });
  }, [moved, valText, valMood, setVal]);

  return (
    <View style={styles.wrap}>
      <ScreenIntro screen={screen} size="md" />

      <View style={styles.center}>
        <View
          style={[styles.panel, { backgroundColor: colors.panel }]}
          accessible
          accessibilityLabel={[
            `${big.label} : ${outputText(big, results[big.key] ?? 0)}`,
            ...others.map((o) => `${o.label} : ${outputText(o, results[o.key] ?? 0)}`),
          ].join('. ')}
          accessibilityLiveRegion="polite"
        >
          <AppText variant="sectionLabel" tone="subtitle" style={styles.label}>
            {big.label}
          </AppText>
          <BigNumber text={outputText(big, rolling)} size={BIG_SIZE} />
          {others.map((o) => (
            <AppText key={o.key} variant="callout" tone="subtitle" style={styles.centerText}>
              {o.caption ? o.caption.replace('{}', outputText(o, results[o.key] ?? 0)) : `${o.label} : ${outputText(o, results[o.key] ?? 0)}`}
            </AppText>
          ))}

          {series ? (
            <View style={styles.chart}>
              <SimChart main={series.main} base={series.base} scale={scale} />
              {/* Bornes de la durée aux deux bouts, légende entre elles */}
              <View style={styles.chartFoot}>
                <AppText variant="caption" tone="subtitle" numberOfLines={1} style={styles.bound}>
                  {series.from}
                </AppText>
                <View style={styles.legend}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendSolid, { backgroundColor: colors.gold }]} />
                    <AppText variant="caption" tone="subtitle">
                      {series.legend[0]}
                    </AppText>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDashed, { borderColor: colors.subtitle }]} />
                    <AppText variant="caption" tone="subtitle">
                      {series.legend[1]}
                    </AppText>
                  </View>
                </View>
                <AppText variant="caption" tone="subtitle" numberOfLines={1} style={styles.bound}>
                  {series.to}
                </AppText>
              </View>
            </View>
          ) : null}
        </View>

        <View>
          <View style={styles.sliderHead}>
            <AppText variant="bodyMedium" style={styles.sliderLabel}>
              {screen.label}
            </AppText>
            <AppText variant="bodyMedium" tone="gold" style={[styles.sliderLabel, styles.tabular]}>
              {sliderText}
            </AppText>
          </View>
          <TrackSlider
            value={value}
            min={min}
            max={max}
            step={step}
            onChange={(next) => {
              setValue(next);
              setMoved(true);
            }}
            accessibilityLabel={screen.label}
            valueText={sliderText}
            inviteDelay={enterDelay + motion.sheet}
          />
          <View style={styles.bounds}>
            <AppText variant="caption" tone="subtitle" style={styles.tabular}>
              {withUnit(formatNumber(min), unit)}
            </AppText>
            <AppText variant="caption" tone="subtitle" style={styles.tabular}>
              {withUnit(formatNumber(max), unit)}
            </AppText>
          </View>
        </View>
      </View>
    </View>
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
    gap: space[5],
  },
  panel: {
    alignItems: 'center',
    padding: space[4],
    borderRadius: radius.lg,
    borderCurve: 'continuous',
  },
  label: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 1.6,
    textAlign: 'center',
  },
  centerText: {
    textAlign: 'center',
  },
  chart: {
    alignSelf: 'stretch',
    marginTop: space[2],
  },
  chartFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space[2],
    marginTop: space[1],
  },
  bound: {
    flexShrink: 0,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    columnGap: space[3],
    flexShrink: 1,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1] + 2,
  },
  legendSolid: {
    width: LEGEND_LINE,
    height: 3,
    borderRadius: radius.pill,
  },
  legendDashed: {
    width: LEGEND_LINE,
    borderTopWidth: 2,
    borderStyle: 'dashed',
  },
  sliderHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: space[1],
  },
  sliderLabel: {
    fontFamily: fonts.bodySemibold,
  },
  bounds: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: space[1],
  },
  tabular: {
    fontVariant: ['tabular-nums'],
  },
});
