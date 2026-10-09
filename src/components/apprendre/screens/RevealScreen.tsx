import { StyleSheet, View } from 'react-native';

import AppText from '@/src/components/common/AppText';
import { durations } from '@/src/constants/motion';
import { fonts, opacityDim, palette, space, titleLetterSpacing } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { useCountUp } from '@/src/hooks/useCountUp';
import { formatNumber } from '@/src/utils/format';
import ScreenIntro from '../player/ScreenIntro';
import { LessonScreenProps } from '../types';

const VALUE_SIZE = 64;
const VALUE_LINE_HEIGHT = 72;
// Le chiffre défile une fois l'écran apparu
const COUNT_DELAY = durations.enterOpacity;

// reveal — un grand chiffre qui défile, avec sa décomposition en dessous.
// Jamais noté : pas de bonne/mauvaise réponse, juste une révélation.
export default function RevealScreen({ screen }: LessonScreenProps) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const { payload } = screen;
  const target = Number(payload.value);
  const hasValue = Number.isFinite(target);
  const lines: any[] = payload.lines ?? [];

  const current = useCountUp(hasValue ? target : 0, { delay: COUNT_DELAY });
  // Pendant le défilement : entiers ; à la fin : la valeur exacte
  const shown = current === target ? target : Math.round(current);
  const unit = payload.unit ? String(payload.unit) : '';

  return (
    <View style={styles.wrap}>
      <ScreenIntro screen={screen} question={payload.question} subtitle={payload.subtitle} />

      <View
        style={styles.figure}
        accessible
        accessibilityLabel={[payload.label, hasValue ? formatNumber(target) : null, unit].filter(Boolean).join(' ')}
      >
        {payload.label ? (
          <AppText variant="sectionLabel" style={styles.center}>
            {payload.label}
          </AppText>
        ) : null}
        {hasValue ? (
          <AppText tone="gold" maxFontSizeMultiplier={1.2} style={styles.value}>
            {formatNumber(shown)}
          </AppText>
        ) : null}
        {unit ? (
          <AppText variant="callout" tone="subtitle" style={styles.center}>
            {unit}
          </AppText>
        ) : null}
      </View>

      {lines.length > 0 ? (
        <View>
          {lines.map((line, i) => (
            <View
              key={i}
              style={[
                styles.line,
                i > 0 && { borderTopWidth: 1, borderTopColor: colors.border },
                line.dim && styles.dim,
              ]}
            >
              <AppText variant="callout" tone={line.key ? 'gold' : 'text'} style={styles.lineLabel}>
                {line.label}
              </AppText>
              <AppText
                variant="callout"
                tone={line.key ? 'gold' : 'text'}
                style={[styles.lineValue, line.key && styles.keyValue]}
              >
                {Number.isFinite(Number(line.value)) ? formatNumber(Number(line.value)) : line.value}
                {unit ? ` ${unit}` : ''}
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
  value: {
    fontFamily: fonts.title,
    fontSize: VALUE_SIZE,
    lineHeight: VALUE_LINE_HEIGHT,
    letterSpacing: titleLetterSpacing(VALUE_SIZE),
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
  line: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: space[3],
    paddingVertical: space[3],
  },
  dim: {
    opacity: opacityDim,
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
