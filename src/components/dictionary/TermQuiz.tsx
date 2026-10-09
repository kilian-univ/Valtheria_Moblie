import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';

import ReliefOption, { OptionState } from '@/src/components/apprendre/player/ReliefOption';
import AppText from '@/src/components/common/AppText';
import Button from '@/src/components/common/Button';
import ReliefCard from '@/src/components/common/ReliefCard';
import ValBubble from '@/src/components/common/ValBubble';
import { fonts, palette, space, titleLetterSpacing } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { quizStreak, useQuizStreak } from '@/src/state/quizStreak';
import { DictionaryEntry, quizFor } from '@/src/utils/dictionary';
import { error, success } from '@/src/utils/haptics';

const VAL_DIAMETER = 48;
const LABEL_ICON = 14;
const VERDICT_ICON = 22;
const VERDICT_SIZE = 18;
// Le compteur de série apparaît à partir de 2 bonnes réponses d'affilée
const STREAK_MIN = 2;

type TermQuizProps = {
  entries: DictionaryEntry[];
  entry: DictionaryEntry;
  // Ouvre la fiche du mot de la question, à la place de la fiche courante
  onOpenTerm: (term: string) => void;
};

// « Teste-toi » : un petit jeu dans une carte en relief. Val pose une question
// tirée pour cette fiche (la même toute la journée), qui porte sur un AUTRE
// mot ; réponses en relief comme dans le lecteur de leçon. Un toucher valide ;
// rien n'est envoyé au serveur. Le parent remonte le bloc à chaque mot (key).
export default function TermQuiz({ entries, entry, onOpenTerm }: TermQuizProps) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const streak = useQuizStreak();
  const [today] = useState(() => new Date());
  const [round, setRound] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const quiz = useMemo(() => quizFor(entries, entry, today, round), [entries, entry, today, round]);

  const answered = picked !== null && quiz !== null;
  const won = answered && quiz.answers[picked].correct;
  const verdict = !answered ? null : won ? 'Bien vu !' : 'Pas tout à fait';

  // Lecteur d'écran : le verdict est annoncé, avec la bonne réponse
  useEffect(() => {
    if (!verdict || !quiz) return;
    AccessibilityInfo.announceForAccessibility(won ? verdict : `${verdict}. La bonne réponse : ${quiz.correctLabel}`);
  }, [verdict, won, quiz]);

  if (!quiz) return null;

  const pick = (index: number) => {
    if (answered) return;
    const correct = quiz.answers[index].correct;
    setPicked(index);
    quizStreak.record(correct);
    if (correct) success();
    else error();
  };

  const stateOf = (index: number): OptionState => {
    if (!answered) return 'idle';
    if (quiz.answers[index].correct) return 'correct';
    return index === picked ? 'wrong' : 'idle';
  };

  const another = () => {
    setRound((r) => r + 1);
    setPicked(null);
  };

  return (
    <ReliefCard>
      <View style={styles.header}>
        <View style={styles.title}>
          <Ionicons name="flash" size={LABEL_ICON} color={colors.gold} />
          <AppText variant="sectionLabel" accessibilityRole="header">
            Teste-toi
          </AppText>
        </View>
        {streak >= STREAK_MIN ? (
          <AppText variant="caption" tone="gold" accessibilityLabel={`${streak} bonnes réponses d'affilée`}>
            {`${streak} d'affilée`}
          </AppText>
        ) : null}
      </View>

      <View style={styles.val}>
        <ValBubble mood={!answered ? 'complice' : won ? 'celebrant' : 'rassurant'} diameter={VAL_DIAMETER} text={quiz.question} />
      </View>
      {quiz.quote ? (
        <AppText variant="body" tone="subtitle" style={styles.quote}>
          {`« ${quiz.quote} »`}
        </AppText>
      ) : null}

      <View style={styles.options} accessibilityRole="radiogroup">
        {quiz.answers.map((answer, i) => (
          <ReliefOption
            key={`${round}-${answer.label}`}
            label={answer.label}
            state={stateOf(i)}
            selected={i === picked}
            disabled={answered}
            onPress={() => pick(i)}
          />
        ))}
      </View>

      {verdict ? (
        <View style={styles.verdict} accessibilityLiveRegion="polite">
          <View style={styles.verdictRow}>
            <Ionicons
              name={won ? 'checkmark-circle' : 'close-circle'}
              size={VERDICT_ICON}
              color={won ? colors.success : colors.error}
            />
            <AppText
              maxFontSizeMultiplier={1.3}
              style={[styles.verdictTitle, { color: won ? colors.success : colors.error }]}
            >
              {verdict}
            </AppText>
          </View>
          {!won ? (
            <AppText variant="body" tone="subtitle">
              {`La bonne réponse : ${quiz.correctLabel}`}
            </AppText>
          ) : null}
        </View>
      ) : null}

      {answered ? (
        <View style={styles.actions}>
          <Button label="Une autre question" onPress={another} />
          <Button
            variant="text"
            label={`Voir la fiche de ${quiz.subject}`}
            onPress={() => onOpenTerm(quiz.subject)}
            accessibilityHint="Remplace cette fiche"
          />
        </View>
      ) : null}
    </ReliefCard>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space[3],
  },
  title: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1] + 2,
  },
  val: {
    marginTop: space[2],
  },
  quote: {
    marginTop: space[1],
  },
  options: {
    gap: space[3],
    marginTop: space[3],
  },
  verdict: {
    gap: space[1],
    marginTop: space[3],
  },
  verdictRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
  },
  verdictTitle: {
    fontFamily: fonts.title,
    fontSize: VERDICT_SIZE,
    lineHeight: 24,
    letterSpacing: titleLetterSpacing(VERDICT_SIZE),
    flexShrink: 1,
  },
  actions: {
    gap: space[1],
    alignItems: 'stretch',
    marginTop: space[3],
  },
});
