import { StyleSheet, View } from 'react-native';

import AppText from '@/src/components/common/AppText';
import ValBubble from '@/src/components/common/ValBubble';
import { fonts, space, titleLetterSpacing } from '@/src/constants/style/Style';
import type { LessonScreen } from '@/src/lesson/model';

export const VAL_DIAMETER = 64;
const QUESTION_SIZE = 24;
const QUESTION_LINE_HEIGHT = 31;

type ScreenIntroProps = {
  screen: LessonScreen;
  // Consigne sous la question (« Plusieurs réponses possibles »)
  hint?: string;
};

// Haut de chaque écran : Val et sa réplique, puis la question.
export default function ScreenIntro({ screen, hint }: ScreenIntroProps) {
  const { question, subtitle } = screen;
  const intro = screen.val.intro;

  return (
    <View style={styles.wrap}>
      {intro ? <ValBubble mood={intro.mood} text={intro.line} diameter={VAL_DIAMETER} /> : null}

      {question ? (
        <View style={styles.questionBlock}>
          <AppText accessibilityRole="header" style={styles.question}>
            {question}
          </AppText>
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
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: space[6],
  },
  questionBlock: {
    gap: space[2],
  },
  question: {
    fontFamily: fonts.title,
    fontSize: QUESTION_SIZE,
    lineHeight: QUESTION_LINE_HEIGHT,
    letterSpacing: titleLetterSpacing(QUESTION_SIZE),
  },
});
