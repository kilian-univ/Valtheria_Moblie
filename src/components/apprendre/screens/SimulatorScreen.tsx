import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import AppText from '@/src/components/common/AppText';
import { fonts, palette, radius, space, titleLetterSpacing } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { useRollingNumber } from '@/src/hooks/useRollingNumber';
import { computeFormula } from '@/src/lesson/formulas';
import { rangeLine } from '@/src/lesson/interactive';
import type { SimulatorOutput, SimulatorScreen as SimulatorModel } from '@/src/lesson/model';
import { formatNumber } from '@/src/utils/format';
import ScreenIntro from '../player/ScreenIntro';
import TrackSlider from '../player/TrackSlider';
import { LessonScreenProps } from '../types';

const BIG_SIZE = 48;
const BIG_LINE_HEIGHT = 56;

// Résultats affichés à l'euro près, arrondis pendant le défilement
function Output({ output, value }: { output: SimulatorOutput; value: number }) {
  const rolling = useRollingNumber(value);
  const text = `${formatNumber(Math.round(rolling), 0)}${output.unit ? ` ${output.unit}` : ''}`;
  return (
    <View
      style={output.big ? styles.big : styles.small}
      accessible
      accessibilityLabel={`${output.label} : ${formatNumber(Math.round(value), 0)} ${output.unit ?? ''}`}
    >
      <AppText variant={output.big ? 'sectionLabel' : 'caption'} tone="subtitle" style={output.big && styles.center}>
        {output.label}
      </AppText>
      <AppText
        tone={output.big ? 'gold' : 'text'}
        variant={output.big ? undefined : 'bodyMedium'}
        maxFontSizeMultiplier={1.2}
        style={output.big ? styles.bigValue : styles.tabular}
      >
        {text}
      </AppText>
    </View>
  );
}

// simulator — un curseur, et des résultats calculés en direct par la formule
// de la leçon (lesson/formulas.ts). La réplique de Val change selon la plage.
// Non noté : « Continuer » s'active dès que le curseur a bougé (le lecteur
// attend une réponse en cours, voir canContinue).
export default function SimulatorScreen({ screen, onDraftChange, setVal }: LessonScreenProps<SimulatorModel>) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const { min, max, step, formula, params, outputs, ranges } = screen;
  const unit = screen.unit ?? '';
  const [value, setValue] = useState(screen.start);
  const [moved, setMoved] = useState(false);

  const results = computeFormula(formula, value, params);
  const val = rangeLine(ranges, value);
  const withUnit = (n: number) => `${formatNumber(n)}${unit ? ` ${unit}` : ''}`;

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
      <ScreenIntro screen={screen} />

      <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.controlBorder }]}>
        {outputs
          .filter((o) => o.big)
          .map((o) => (
            <Output key={o.key} output={o} value={results[o.key] ?? 0} />
          ))}
        <View style={styles.smalls}>
          {outputs
            .filter((o) => !o.big)
            .map((o) => (
              <Output key={o.key} output={o} value={results[o.key] ?? 0} />
            ))}
        </View>
      </View>

      <View>
        <View style={styles.sliderHead}>
          <AppText variant="bodyMedium">{screen.label}</AppText>
          <AppText variant="bodyMedium" tone="gold" style={styles.tabular}>
            {withUnit(value)}
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
          valueText={withUnit(value)}
        />
        <View style={styles.bounds}>
          <AppText variant="caption" tone="subtitle" style={styles.tabular}>
            {withUnit(min)}
          </AppText>
          <AppText variant="caption" tone="subtitle" style={styles.tabular}>
            {withUnit(max)}
          </AppText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    gap: space[6],
  },
  panel: {
    gap: space[4],
    padding: space[5],
    borderWidth: 1,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
  },
  big: {
    alignItems: 'center',
    gap: space[1],
  },
  bigValue: {
    fontFamily: fonts.title,
    fontSize: BIG_SIZE,
    lineHeight: BIG_LINE_HEIGHT,
    letterSpacing: titleLetterSpacing(BIG_SIZE),
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
  smalls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: space[6],
  },
  small: {
    alignItems: 'center',
    gap: 2,
  },
  center: {
    textAlign: 'center',
  },
  sliderHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bounds: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tabular: {
    fontVariant: ['tabular-nums'],
  },
});
