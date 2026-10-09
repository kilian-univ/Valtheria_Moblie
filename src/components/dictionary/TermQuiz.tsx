import { useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';

import ReliefOption, { OptionState } from '@/src/components/apprendre/player/ReliefOption';
import AppText from '@/src/components/common/AppText';
import Button from '@/src/components/common/Button';
import { space } from '@/src/constants/style/Style';
import { DictionaryEntry, quizFor } from '@/src/utils/dictionary';
import { error, success } from '@/src/utils/haptics';

type TermQuizProps = {
  entries: DictionaryEntry[];
  entry: DictionaryEntry;
  // Ouvre la fiche du mot de la question, à la place de la fiche courante
  onOpenTerm: (term: string) => void;
};

// « Teste-toi » : une question tirée pour cette fiche (la même toute la
// journée), qui porte sur un AUTRE mot ; réponses en relief comme dans le
// lecteur de leçon. Un toucher valide ; rien n'est envoyé au serveur. Le
// parent remonte le bloc à chaque mot (key).
export default function TermQuiz({ entries, entry, onOpenTerm }: TermQuizProps) {
  const [today] = useState(() => new Date());
  const [round, setRound] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const quiz = useMemo(() => quizFor(entries, entry, today, round), [entries, entry, today, round]);

  const answered = picked !== null && quiz !== null;
  const won = answered && quiz.answers[picked].correct;
  // Point final unique, même si la réponse en a déjà un (ou des points de suspension)
  const feedback = !answered
    ? null
    : won
      ? 'Bien vu !'
      : `La bonne réponse était ${quiz.correctLabel.replace(/[.!?…]+$/, '')}.`;

  // Lecteur d'écran : le verdict est annoncé
  useEffect(() => {
    if (feedback) AccessibilityInfo.announceForAccessibility(feedback);
  }, [feedback]);

  if (!quiz) return null;

  const pick = (index: number) => {
    if (answered) return;
    setPicked(index);
    if (quiz.answers[index].correct) success();
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
    <View style={styles.stack}>
      <AppText variant="sectionLabel" accessibilityRole="header">
        Teste-toi
      </AppText>
      <AppText variant="bodyMedium">{quiz.question}</AppText>
      {quiz.quote ? (
        <AppText variant="body" tone="subtitle">
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

      {feedback ? (
        <View style={styles.after}>
          <AppText variant="bodyMedium" tone={won ? 'success' : 'text'} accessibilityLiveRegion="polite">
            {feedback}
          </AppText>
          <Button
            variant="text"
            label={`Voir la fiche de ${quiz.subject}`}
            onPress={() => onOpenTerm(quiz.subject)}
            accessibilityHint="Remplace cette fiche"
          />
          <Button variant="text" label="Une autre question" onPress={another} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: space[3],
  },
  options: {
    gap: space[3],
    marginTop: space[1],
  },
  after: {
    alignItems: 'flex-start',
    gap: space[1],
    marginTop: space[1],
  },
});
