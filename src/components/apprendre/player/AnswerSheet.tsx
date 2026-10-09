import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import AppText from '@/src/components/common/AppText';
import BottomSheet from '@/src/components/common/BottomSheet';
import Button from '@/src/components/common/Button';
import ValBubble, { ValAvatar } from '@/src/components/common/ValBubble';
import { fonts, palette, space } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { ValLine } from '../types';
import { VAL_DIAMETER } from './ScreenIntro';

const ICON_SIZE = 28;
// Au-delà, le contenu de la feuille défile (le bouton reste visible)
const MAX_CONTENT_RATIO = 0.55;

export type Verdict = {
  correct: boolean;
  firstTry: boolean;
  correctText: string | null;
  explanation?: string;
  // Réplique de Val prévue par la leçon (screen.val.correct / wrong)
  val?: ValLine;
};

type AnswerSheetProps = {
  open: boolean;
  verdict: Verdict;
  onContinue: () => void;
  // Retour Android : le lecteur propose de quitter
  onRequestClose: () => void;
  onClosed: () => void;
  // Envoi des réponses en cours / échoué (dernier écran)
  loading?: boolean;
  errorText?: string | null;
};

// Feuille de correction, sans voile : l'écran reste visible au-dessus avec
// ses options colorées. Ne se ferme que par « Continuer ».
export default function AnswerSheet({
  open,
  verdict,
  onContinue,
  onRequestClose,
  onClosed,
  loading,
  errorText,
}: AnswerSheetProps) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const { height } = useWindowDimensions();
  const { correct } = verdict;

  const fallbackMood = correct ? 'celebrant' : 'rassurant';

  return (
    <BottomSheet
      open={open}
      onRequestClose={onRequestClose}
      onClosed={onClosed}
      scrim={false}
      dismissible={false}
      backgroundColor={correct ? colors.successSheet : colors.dangerSheet}
    >
      <View style={styles.content} accessibilityLiveRegion="assertive">
        <View style={styles.titleRow} accessible accessibilityRole="header">
          <Ionicons
            name={correct ? 'checkmark-circle-outline' : 'close-circle-outline'}
            size={ICON_SIZE}
            color={correct ? colors.success : colors.error}
          />
          <AppText variant="title2" tone={correct ? 'success' : 'error'} style={styles.title}>
            {correct ? 'Bien vu !' : 'Pas tout à fait'}
          </AppText>
        </View>

        <ScrollView style={{ maxHeight: height * MAX_CONTENT_RATIO }} contentContainerStyle={styles.body}>
          {verdict.val?.line ? (
            <ValBubble mood={verdict.val.mood} text={verdict.val.line} diameter={VAL_DIAMETER} />
          ) : (
            <ValAvatar mood={fallbackMood} diameter={VAL_DIAMETER} />
          )}

          {!correct && verdict.correctText ? (
            <AppText variant="bodyMedium">
              {verdict.correctText.includes(', ') ? 'Les bonnes réponses : ' : 'La bonne réponse : '}
              {verdict.correctText}
            </AppText>
          ) : null}

          {verdict.explanation ? <AppText variant="body">{verdict.explanation}</AppText> : null}

          {correct && verdict.firstTry ? (
            <AppText variant="callout" tone="gold" style={styles.firstTry}>
              + 1 bonne réponse du premier coup
            </AppText>
          ) : null}
        </ScrollView>

        {errorText ? (
          <AppText variant="callout" tone="error" accessibilityRole="alert">
            {errorText}
          </AppText>
        ) : null}

        <Button
          label={errorText ? 'Réessayer' : 'Continuer'}
          variant={correct ? 'success' : 'danger'}
          onPress={onContinue}
          loading={loading}
        />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: space[4],
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
  },
  title: {
    flexShrink: 1,
  },
  body: {
    gap: space[3],
  },
  firstTry: {
    fontFamily: fonts.bodySemibold,
  },
});
