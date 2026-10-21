import { useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import AppText from '@/src/components/common/AppText';
import BigNumber from '@/src/components/common/BigNumber';
import { motion } from '@/src/constants/motion';
import { Live, useLiveStore } from '@/src/hooks/useLiveValue';
import { space } from '@/src/constants/style/Style';
import type { SliderScreen as SliderModel } from '@/src/lesson/model';
import { widestText, windowFitHeight } from '@/src/utils/fit';
import { formatNumber, withUnit } from '@/src/utils/format';
import { grade } from '@/src/utils/grade';
import ScreenIntro from '../player/ScreenIntro';
import TrackSlider from '../player/TrackSlider';
import { LessonScreenProps } from '../types';

// Réduit sur un écran bas (iPhone SE), jamais sous VALUE_MIN
const VALUE_MIN = 60;
const VALUE_SIZE = 78;

// slider — le pari. Non noté : estimation libre (rappelée par une
// révélation via from_screen) ; noté : juste dans la tolérance (grade.ts).
// Réponse : la valeur choisie, signalée au lecteur dès que le curseur a
// bougé (le bouton reste inactif avant).
export default function SliderScreen({ screen, answered, onDraftChange, enterDelay }: LessonScreenProps<SliderModel>) {
  const { min, max, step, unit } = screen;
  const { height } = useWindowDimensions();
  const valueSize = windowFitHeight(VALUE_SIZE, VALUE_MIN, height);

  // Valeur posée (au lâcher), et valeur vivante pendant le glissement : seul
  // le grand chiffre la suit, l'écran ne se re-rend pas à chaque cran
  const [value, setValue] = useState(() =>
    Math.min(max, Math.max(min, min + Math.round((screen.start - min) / step) * step))
  );
  const live = useLiveStore(value);
  const format = (n: number) => withUnit(formatNumber(n), unit);

  // La valeur choisie remonte au lecteur au lâcher (valeur finale exacte) :
  // envoyée si l'écran est noté, gardée pour une révélation sinon
  const commit = (next: number) => {
    live.set(next);
    setValue(next);
    onDraftChange({
      raw: next,
      correct: screen.scored ? grade(screen.source, next) === true : true,
      correctText: screen.answer !== null ? format(screen.answer) : null,
    });
  };

  // Taille fixe : celle de la valeur la plus longue du curseur
  const longest = widestText([withUnit(formatNumber(min), unit), withUnit(formatNumber(max), unit)]);

  return (
    <View style={styles.wrap}>
      <ScreenIntro screen={screen} size="md" />

      <View style={styles.center}>
        <Live store={live}>{(n) => <BigNumber text={format(n)} sizingText={longest} size={valueSize} />}</Live>

        <View style={styles.slider}>
          <TrackSlider
            value={value}
            min={min}
            max={max}
            step={step}
            onChange={live.set}
            onCommit={commit}
            disabled={answered}
            accessibilityLabel={screen.question ?? 'Ton pari'}
            formatValue={format}
            // Le bouton invite à glisser une fois l'écran arrivé
            inviteDelay={enterDelay + motion.sheet}
          />
          <View style={styles.bounds}>
            <AppText variant="callout" tone="subtitle" style={styles.tabular}>
              {withUnit(formatNumber(min), unit)}
            </AppText>
            <AppText variant="callout" tone="subtitle" style={styles.tabular}>
              {withUnit(formatNumber(max), unit)}
            </AppText>
          </View>
        </View>

        {screen.scored ? null : (
          <AppText variant="callout" tone="subtitle" style={styles.hint}>
            Fais glisser pour parier
          </AppText>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    gap: space[6],
  },
  // La valeur et le curseur se placent au centre de la place qui reste
  center: {
    flex: 1,
    justifyContent: 'center',
  },
  slider: {
    marginTop: space[6],
  },
  bounds: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: space[1],
  },
  tabular: {
    fontVariant: ['tabular-nums'],
  },
  hint: {
    textAlign: 'center',
    marginTop: space[4],
  },
});
