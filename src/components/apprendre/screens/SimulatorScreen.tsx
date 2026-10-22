import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useDerivedValue, useSharedValue } from 'react-native-reanimated';

import AppText from '@/src/components/common/AppText';
import { LiveBigNumber } from '@/src/components/common/BigNumber';
import LiveText from '@/src/components/common/LiveText';
import { motion } from '@/src/constants/motion';
import { fonts, palette, radius, space } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { computeFormula, formulaSeries, seriesScale } from '@/src/lesson/formulas';
import { rangeLine } from '@/src/lesson/interactive';
import type { SimulatorOutput, SimulatorScreen as SimulatorModel } from '@/src/lesson/model';
import { simulatorTable, tableRow } from '@/src/lesson/simulatorTable';
import { widestText } from '@/src/utils/fit';
import { formatNumber, withUnit } from '@/src/utils/format';
import ScreenIntro from '../player/ScreenIntro';
import SimChart from '../player/SimChart';
import TrackSlider from '../player/TrackSlider';
import { LessonScreenProps } from '../types';

const BIG_SIZE = 56;
const LEGEND_LINE = 14;
// Bornes sous la courbe (« 30 ans », « 65 ans ») : largeur réservée
const BOUND_WIDTH = 84;
// Textes qui changent pendant le glissement : grandissement plafonné (ils
// tiennent sur une ligne)
const LIVE_MAX_SCALE = 1.4;

// Résultat arrondi à l'unité, avec son unité
function outputText(output: SimulatorOutput, value: number): string {
  return withUnit(formatNumber(Math.round(value), 0), output.unit);
}

// Ligne sous le gros chiffre (« dont 36 000 € versés »)
function captionText(output: SimulatorOutput, value: number): string {
  const amount = outputText(output, value);
  return output.caption ? output.caption.replace('{}', amount) : `${output.label} : ${amount}`;
}

// simulator — un curseur, et des résultats calculés par la formule de la
// leçon (lesson/formulas.ts) : un gros chiffre, une petite courbe de
// l'argent qui grossit sur la durée. Non noté : « Continuer » s'active au
// premier lâcher.
// Pendant le glissement, AUCUN rendu React (lot 8) : le bouton suit le doigt
// sur le fil d'interface, et à chaque cran, le fil d'interface lit la ligne
// de la table calculée d'avance (simulatorTable) : les montants (LiveText),
// la valeur du curseur et la courbe (SimChart, tracés SVG animés) changent
// sans passer par React. Au lâcher, React reprend la main avec la valeur
// exacte : texte lu par le lecteur d'écran, phrase de Val de la tranche,
// « Continuer ».
export default function SimulatorScreen({ screen, onDraftChange, setVal, enterDelay }: LessonScreenProps<SimulatorModel>) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const { min, max, step, formula, params, outputs, ranges, unit } = screen;
  // Valeur posée (au lâcher, ou par le lecteur d'écran)
  const [settled, setSettled] = useState(screen.start);
  const [moved, setMoved] = useState(false);

  const table = useMemo(() => simulatorTable(formula, params, min, max, step), [formula, params, min, max, step]);
  const rows = table.values.length;
  const rowOf = (v: number) => tableRow(v, min, step, table.stride, rows);
  // Valeur du curseur, écrite par lui à chaque cran sur le fil d'interface,
  // et la ligne de la table qui en découle
  const raw = useSharedValue(screen.start);
  const stride = table.stride;
  const row = useDerivedValue(() => tableRow(raw.get(), min, step, stride, rows));
  // Valeur posée par React (lâcher, lecteur d'écran) : la table suit
  useEffect(() => {
    raw.set(settled);
  }, [settled, raw]);

  const big = outputs.find((o) => o.big) ?? outputs[0];
  const others = outputs.filter((o) => o !== big);
  // Textes de chaque ligne, calculés une fois
  const texts = useMemo(
    () => ({
      big: table.results.map((r) => outputText(big, r[big.key] ?? 0)),
      others: others.map((o) => table.results.map((r) => captionText(o, r[o.key] ?? 0))),
      slider: table.values.map((v) => withUnit(formatNumber(v), unit)),
    }),
    [table, big, others, unit]
  );
  const scale = useMemo(() => seriesScale(formula, min, max, params), [formula, min, max, params]);
  const settledRow = rowOf(settled);
  const results = computeFormula(formula, settled, params);
  const series = formulaSeries(formula, settled, params);
  // Taille fixe du gros chiffre : celle du résultat le plus long de la table
  const longest = useMemo(() => widestText(texts.big), [texts.big]);
  // Lecteur d'écran : la valeur du curseur et le résultat qui en découle
  const spokenValue = (n: number) =>
    `${withUnit(formatNumber(n), unit)}, ${big.label} : ${outputText(big, computeFormula(formula, n, params)[big.key] ?? 0)}`;

  // Lâcher : la valeur finale exacte, « Continuer » s'active
  const commit = (next: number) => {
    setSettled(next);
    setMoved(true);
    onDraftChange({ raw: next, correct: true, correctText: null });
  };

  // Val (en haut de l'écran) change de phrase au lâcher, si la tranche change
  const val = rangeLine(ranges, settled);
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
          <LiveBigNumber texts={texts.big} index={row} fallback={texts.big[settledRow] ?? ''} sizingText={longest} size={BIG_SIZE} />
          {others.map((o, i) => (
            <LiveText
              key={o.key}
              texts={texts.others[i]}
              index={row}
              fallback={texts.others[i][settledRow] ?? ''}
              maxFontSizeMultiplier={LIVE_MAX_SCALE}
              style={[styles.caption, { color: colors.subtitle }]}
            />
          ))}

          {series ? (
            <View style={styles.chart}>
              <SimChart main={table.main} base={table.base} row={row} scale={scale} />
              {/* Bornes de la durée aux deux bouts, légende entre elles */}
              <View style={styles.chartFoot}>
                <LiveText
                  texts={table.from}
                  index={row}
                  fallback={table.from[settledRow] ?? series.from}
                  maxFontSizeMultiplier={LIVE_MAX_SCALE}
                  style={[styles.boundText, styles.bound, { color: colors.subtitle }]}
                />
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
                <AppText variant="caption" tone="subtitle" numberOfLines={1} style={[styles.bound, styles.boundEnd]}>
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
            {/* Suit chaque cran sur le fil d'interface */}
            <LiveText
              texts={texts.slider}
              index={row}
              fallback={texts.slider[settledRow] ?? ''}
              maxFontSizeMultiplier={LIVE_MAX_SCALE}
              style={[styles.sliderValue, { color: colors.gold }]}
            />
          </View>
          <TrackSlider
            value={settled}
            min={min}
            max={max}
            step={step}
            uiValue={raw}
            onCommit={commit}
            accessibilityLabel={screen.label}
            formatValue={spokenValue}
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
  // Ligne sous le gros chiffre (style « callout » d'AppText)
  caption: {
    alignSelf: 'stretch',
    fontFamily: fonts.body,
    fontSize: 14,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
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
    width: BOUND_WIDTH,
  },
  boundEnd: {
    textAlign: 'right',
  },
  // Borne de gauche (style « caption » d'AppText)
  boundText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
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
  // Valeur du curseur (style « bodyMedium » d'AppText, en or)
  sliderValue: {
    flex: 1,
    fontFamily: fonts.bodySemibold,
    fontSize: 16,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
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
