import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import ChoiceButton from '../ChoiceButton';
import ContinueButton from '../ContinueButton';
import MaxBubble from '../MaxBubble';
import { Choice, LessonScreenProps } from '../types';

// scenario — choix avec bonne/mauvaise réponse (is_best), explication
export default function ScenarioScreen({ screen, colors, onNext, onRecordAnswer, isLast, onFinish, isSubmitting }: LessonScreenProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const choices: Choice[] = screen.choices ?? [];
  const selected = choices.find((c) => c.id === selectedId);
  const isCorrect = !!selected?.is_best;

  const handleSelect = (choice: Choice) => {
    if (answered) return;
    setSelectedId(choice.id);
    setAnswered(true);
    onRecordAnswer({ type: 'scenario', correct: !!choice.is_best, concept: screen.concept });
  };

  const feedbackMax = answered ? (isCorrect ? screen.max_correct : screen.max_wrong) : null;

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
      <MaxBubble max={answered ? feedbackMax : screen.max} colors={colors} />
      {screen.intro && (
        <Text style={{ color: colors.text, fontSize: 15, marginHorizontal: 20, marginBottom: 12, lineHeight: 21 }}>
          {screen.intro}
        </Text>
      )}
      {screen.question && (
        <Text style={{ color: colors.text, fontSize: 17, fontWeight: '700', marginHorizontal: 20, marginBottom: 16 }}>
          {screen.question}
        </Text>
      )}

      <View style={{ paddingHorizontal: 20 }}>
        {choices.map((choice) => (
          <ChoiceButton
            key={choice.id}
            choice={choice}
            isSelected={selectedId === choice.id}
            isCorrectChoice={answered ? choice.is_best : undefined}
            showResult={answered}
            onPress={() => handleSelect(choice)}
            colors={colors}
          />
        ))}
      </View>

      {answered && (selected?.feedback || screen.explanation) && (
        <View style={{ marginHorizontal: 20, marginTop: 8, padding: 14, borderRadius: 12, backgroundColor: colors.surface }}>
          {selected?.feedback && (
            <Text style={{ color: colors.text, fontSize: 14, lineHeight: 20, marginBottom: screen.explanation ? 8 : 0 }}>
              {selected.feedback}
            </Text>
          )}
          {screen.explanation && (
            <Text style={{ color: colors.subtitle, fontSize: 13, lineHeight: 19 }}>{screen.explanation}</Text>
          )}
        </View>
      )}

      {answered &&
        (isLast ? (
          <ContinueButton colors={colors} onPress={onFinish} label="Terminer la leçon" loading={isSubmitting} />
        ) : (
          <ContinueButton colors={colors} onPress={onNext} />
        ))}
    </ScrollView>
  );
}