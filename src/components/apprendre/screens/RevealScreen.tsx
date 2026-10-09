import { StyleSheet, View } from 'react-native';

import AppText from '@/src/components/common/AppText';
import { durations } from '@/src/constants/motion';
import { fonts, palette, space, titleLetterSpacing } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { useCountUp } from '@/src/hooks/useCountUp';
import type { RevealScreen as RevealModel } from '@/src/lesson/model';
import { formatNumber } from '@/src/utils/format';
import { estimateSentence } from '@/src/utils/lessonPlayer';
import ScreenIntro from '../player/ScreenIntro';
import { LessonScreenProps } from '../types';

const VALUE_SIZE = 64;
const VALUE_LINE_HEIGHT = 72;
const GUESS_SIZE = 20;
const GUESS_LINE_HEIGHT = 26;
// Le chiffre défile une fois l'écran apparu
const COUNT_DELAY = durations.enterOpacity;

// reveal — un grand chiffre qui défile, avec sa décomposition en dessous.
// Jamais noté. Si from_screen désigne une estimation précédente, elle est
// rappelée au-dessus du vrai chiffre.
export default function RevealScreen({ screen, estimate }: LessonScreenProps<RevealModel>) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const { value, unit, decimals, lines, label } = screen;

  const current = useCountUp(value, { delay: COUNT_DELAY });
  // Pendant le défilement : arrondi aux décimales prévues ; à la fin : la valeur exacte
  const shown = current === value ? value : Math.round(current * 10 ** decimals) / 10 ** decimals;
  const withUnit = (n: number) => `${formatNumber(n, decimals)}${unit ? ` ${unit}` : ''}`;
  const sentence = estimate !== null ? estimateSentence(estimate, value) : null;

  return (
    <View style={styles.wrap}>
      <ScreenIntro screen={screen} />

      <View
        style={styles.figure}
        accessible
        accessibilityLabel={[
          estimate !== null ? `Ton estimation : ${withUnit(estimate)}` : null,
          label,
          withUnit(value),
          sentence,
        ]
          .filter(Boolean)
          .join('. ')}
      >
        {estimate !== null ? (
          <View style={styles.guess}>
            <AppText variant="sectionLabel" tone="subtitle" style={styles.center}>
              Ton estimation
            </AppText>
            <AppText tone="subtitle" maxFontSizeMultiplier={1.3} style={[styles.guessValue, styles.center]}>
              {withUnit(estimate)}
            </AppText>
          </View>
        ) : null}

        {label ? (
          <AppText variant="sectionLabel" style={styles.center}>
            {label}
          </AppText>
        ) : null}
        <AppText tone="gold" maxFontSizeMultiplier={1.2} style={styles.value}>
          {formatNumber(shown, decimals)}
        </AppText>
        {unit ? (
          <AppText variant="callout" tone="subtitle" style={styles.center}>
            {unit}
          </AppText>
        ) : null}
        {sentence ? (
          <AppText variant="bodyMedium" style={[styles.center, styles.sentence]}>
            {sentence}
          </AppText>
        ) : null}
      </View>

      {lines.length > 0 ? (
        <View>
          {lines.map((line, i) => (
            <View key={i} style={[styles.line, i > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}>
              <AppText variant="callout" tone={line.key ? 'gold' : 'text'} style={styles.lineLabel}>
                {line.label}
              </AppText>
              {/* Pas d'unité ici : elle ne vaut que pour le grand chiffre */}
              <AppText
                variant="callout"
                tone={line.key ? 'gold' : 'text'}
                style={[styles.lineValue, line.key && styles.keyValue]}
              >
                {typeof line.value === 'number' ? formatNumber(line.value) : line.value}
              </AppText>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: space[6],
  },
  figure: {
    alignItems: 'center',
    gap: space[1],
  },
  center: {
    textAlign: 'center',
  },
  guess: {
    alignItems: 'center',
    gap: space[1],
    marginBottom: space[4],
  },
  guessValue: {
    fontFamily: fonts.bodySemibold,
    fontSize: GUESS_SIZE,
    lineHeight: GUESS_LINE_HEIGHT,
    fontVariant: ['tabular-nums'],
  },
  value: {
    fontFamily: fonts.title,
    fontSize: VALUE_SIZE,
    lineHeight: VALUE_LINE_HEIGHT,
    letterSpacing: titleLetterSpacing(VALUE_SIZE),
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
  sentence: {
    marginTop: space[2],
  },
  line: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: space[3],
    paddingVertical: space[3],
  },
  lineLabel: {
    flex: 1,
  },
  lineValue: {
    fontVariant: ['tabular-nums'],
  },
  keyValue: {
    fontFamily: fonts.bodySemibold,
  },
});
