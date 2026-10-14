import { StyleSheet, View } from 'react-native';

import AppText from '@/src/components/common/AppText';
import { fonts, space, titleLetterSpacing } from '@/src/constants/style/Style';
import type { LessonScreen } from '@/src/lesson/model';

// Portrait rond de Val dans les feuilles (quitter la leçon)
export const VAL_DIAMETER = 64;

// md : sous un pari (23/30) ; lg : question à choix et autres (25/31)
const QUESTION = {
  md: { fontSize: 23, lineHeight: 30 },
  lg: { fontSize: 25, lineHeight: 31 },
} as const;

type ScreenIntroProps = {
  screen: LessonScreen;
  // Consigne sous la question (« Plusieurs réponses possibles »)
  hint?: string;
  size?: keyof typeof QUESTION;
};

// La question de l'écran, sous Val (posé par le lecteur), avec sa
// précision et sa consigne éventuelles.
export default function ScreenIntro({ screen, hint, size = 'lg' }: ScreenIntroProps) {
  const { question, subtitle } = screen;
  if (!question && !hint) return null;
  const type = QUESTION[size];

  return (
    <View style={styles.block}>
      {question ? (
        <AppText
          accessibilityRole="header"
          maxFontSizeMultiplier={1.3}
          style={[styles.question, type, { letterSpacing: titleLetterSpacing(type.fontSize) }]}
        >
          {question}
        </AppText>
      ) : null}
      {subtitle ? (
        <AppText variant="callout" tone="subtitle">
          {subtitle}
        </AppText>
      ) : null}
      {hint ? (
        <AppText variant="callout" tone="subtitle">
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: space[2],
  },
  question: {
    fontFamily: fonts.title,
  },
});
