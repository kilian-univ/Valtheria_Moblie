import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AppText from '@/src/components/common/AppText';
import Button from '@/src/components/common/Button';
import PageState from '@/src/components/common/PageState';
import ValBubble from '@/src/components/common/ValBubble';
import { fonts, space, titleLetterSpacing } from '@/src/constants/style/Style';
import { useApi } from '@/src/context/ApiContext';
import type { Declic } from '@/src/utils/notebook';
import { normalizeLesson } from '@/src/lesson/normalize';
import ApprendreDetailScreen from '@/src/screens/ApprendreDetailScreen';
import { useNotebook } from '@/src/state/notebook';
import { userKeyOf } from '@/src/state/userMemory';
import type { LessonSummary } from '@/src/utils/lessonPlayer';
import { buildQuiz, quizLesson, quizVerdict } from '@/src/utils/notebook';

const VAL_DIAMETER = 72;
const SCORE_SIZE = 44;

// Test « Me tester sur mes déclics » : jusqu'à 5 phrases du carnet, un mot
// clé masqué, trois choix. Même lecteur, mêmes retours et mêmes sons que les
// leçons (sans XP pour l'instant), puis un petit bilan avec Val.
export default function NotebookQuizScreen() {
  const { user } = useApi();
  const declics = useNotebook(userKeyOf(user?.id));
  // Chaque nouvel essai tire de nouvelles questions
  const [round, setRound] = useState(0);
  const [result, setResult] = useState<LessonSummary | null>(null);

  if (declics === null) return null;
  // Carnet vide : rien à tester (et pas « Je ne trouve pas cette leçon »)
  if (declics.length === 0) return <EmptyNotebook />;
  if (result) {
    return (
      <QuizRecap
        summary={result}
        onAgain={() => {
          setResult(null);
          setRound((r) => r + 1);
        }}
      />
    );
  }
  return <QuizPlayer key={round} declics={declics} onFinished={setResult} />;
}

function EmptyNotebook() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.emptyScreen, { paddingTop: insets.top + space[8] }]}>
      <PageState
        variant="empty"
        mood="complice"
        text="Ton carnet est encore vide : termine une leçon, et on se teste sur tes déclics."
        actionLabel="Retour"
        onAction={() => router.back()}
      />
    </View>
  );
}

function QuizPlayer({ declics, onFinished }: { declics: Declic[]; onFinished: (s: LessonSummary) => void }) {
  const [lesson] = useState(() => normalizeLesson(quizLesson(buildQuiz(declics))));
  const finished = useCallback((summary: LessonSummary) => onFinished(summary), [onFinished]);
  const mode = useMemo(
    () => ({ lesson, onFinished: finished, badge: 'MES DÉCLICS', retry: false, exitTo: '/client/carnet' as const }),
    [lesson, finished]
  );
  return <ApprendreDetailScreen discovery={mode} />;
}

function QuizRecap({ summary, onAgain }: { summary: LessonSummary; onAgain: () => void }) {
  const insets = useSafeAreaInsets();
  const val = quizVerdict(summary.correct, summary.total);
  return (
    <View style={[styles.recap, { paddingTop: insets.top + space[4], paddingBottom: insets.bottom + space[3] }]}>
      <View style={styles.center}>
        <AppText
          maxFontSizeMultiplier={1.2}
          style={styles.score}
          accessibilityRole="header"
          accessibilityLabel={`${summary.correct} bonnes réponses sur ${summary.total}`}
        >
          {`${summary.correct} sur ${summary.total}`}
        </AppText>
        <ValBubble mood={val.mood} diameter={VAL_DIAMETER} text={val.line} />
      </View>
      <View style={styles.buttons}>
        <Button label="Revoir mon carnet" onPress={() => (router.canGoBack() ? router.back() : router.replace('/client/carnet'))} />
        <Button variant="secondary" label="Refaire le test" onPress={onAgain} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyScreen: {
    flex: 1,
  },
  recap: {
    flex: 1,
    paddingHorizontal: space[5],
    justifyContent: 'space-between',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    gap: space[6],
    alignItems: 'stretch',
  },
  score: {
    fontFamily: fonts.title,
    fontSize: SCORE_SIZE,
    lineHeight: SCORE_SIZE + 8,
    letterSpacing: titleLetterSpacing(SCORE_SIZE),
    textAlign: 'center',
  },
  buttons: {
    gap: space[2],
  },
});
