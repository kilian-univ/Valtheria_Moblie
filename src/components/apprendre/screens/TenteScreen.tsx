import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import ChoiceButton from '../ChoiceButton';
import ContinueButton from '../ContinueButton';
import MaxBubble from '../MaxBubble';
import RichText from '../RichText';
import { Choice, LessonScreenProps } from '../types';

// tente — deviner, puis révélation pédagogique (pas de bonne/mauvaise réponse marquée)
export default function TenteScreen({ screen, colors, onNext, isLast, onFinish, isSubmitting }: LessonScreenProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const choices: Choice[] = screen.choices ?? [];

  const handleSelect = (choice: Choice) => {
    if (revealed) return;
    setSelectedId(choice.id);
    setRevealed(true);
  };

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
      <MaxBubble max={screen.max} colors={colors} />
      {screen.prompt && (
        <Text style={{ color: colors.text, fontSize: 17, fontWeight: '700', marginHorizontal: 20, marginBottom: 16 }}>
          {screen.prompt}
        </Text>
      )}

      <View style={{ paddingHorizontal: 20 }}>
        {choices.map((choice) => (
          <ChoiceButton
            key={choice.id}
            choice={choice}
            isSelected={selectedId === choice.id}
            showResult={revealed}
            onPress={() => handleSelect(choice)}
            colors={colors}
          />
        ))}
      </View>

      {revealed && screen.reveal_after && (
        <View style={{ marginHorizontal: 20, marginTop: 8, padding: 14, borderRadius: 12, backgroundColor: colors.surface }}>
          <RichText text={screen.reveal_after} colors={colors} />
        </View>
      )}

      {revealed &&
        (isLast ? (
          <ContinueButton colors={colors} onPress={onFinish} label="Terminer la leçon" loading={isSubmitting} />
        ) : (
          <ContinueButton colors={colors} onPress={onNext} />
        ))}
    </ScrollView>
  );
}