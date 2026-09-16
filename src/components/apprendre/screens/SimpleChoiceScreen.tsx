import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import ChoiceButton from '../ChoiceButton';
import ContinueButton from '../ContinueButton';
import MaxBubble from '../MaxBubble';
import { Choice, LessonScreenProps } from '../types';

// hook / application_personnelle — question + choix, feedback narratif, pas de score
export default function SimpleChoiceScreen({ screen, colors, onNext, isLast, onFinish, isSubmitting }: LessonScreenProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const choices: Choice[] = screen.choices ?? [];
  const selected = choices.find((c) => c.id === selectedId);

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
      <MaxBubble max={screen.max} colors={colors} />
      {screen.big && (
        <Text style={{ color: colors.text, fontSize: 26, fontWeight: '800', marginHorizontal: 20, marginBottom: 12 }}>
          {screen.big}
        </Text>
      )}
      {(screen.q || screen.question) && (
        <Text style={{ color: colors.text, fontSize: 17, fontWeight: '700', marginHorizontal: 20, marginBottom: 16 }}>
          {screen.q || screen.question}
        </Text>
      )}

      <View style={{ paddingHorizontal: 20 }}>
        {choices.map((choice) => (
          <ChoiceButton
            key={choice.id}
            choice={choice}
            isSelected={selectedId === choice.id}
            showResult={false}
            onPress={() => setSelectedId(choice.id)}
            colors={colors}
          />
        ))}
      </View>

      {selected?.feedback && (
        <View style={{ marginHorizontal: 20, marginTop: 8, padding: 14, borderRadius: 12, backgroundColor: colors.surface }}>
          <Text style={{ color: colors.subtitle, fontSize: 14, lineHeight: 20 }}>{selected.feedback}</Text>
        </View>
      )}

      {isLast ? (
        <ContinueButton
          colors={colors}
          onPress={onFinish}
          label="Terminer la leçon"
          disabled={!selectedId}
          loading={isSubmitting}
        />
      ) : (
        <ContinueButton colors={colors} onPress={onNext} disabled={!selectedId} />
      )}
    </ScrollView>
  );
}