import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import ContinueButton from '../ContinueButton';
import MaxBubble from '../MaxBubble';
import { LessonScreenProps } from '../types';

// sentence_build — reconstituer une phrase en tapant les blocs dans l'ordre
export default function SentenceBuildScreen({ screen, colors, onNext, onRecordAnswer, isLast, onFinish, isSubmitting }: LessonScreenProps) {
  const tiles: string[] = screen.tiles ?? [];
  const correctOrder: number[] = screen.correct_order ?? tiles.map((_, i) => i);
  const [order, setOrder] = useState<number[]>([]);
  const [checked, setChecked] = useState(false);

  const isCorrect = checked && JSON.stringify(order) === JSON.stringify(correctOrder);
  const available = tiles.map((_, i) => i).filter((i) => !order.includes(i));

  const handleTapTile = (i: number) => {
    if (checked) return;
    setOrder((prev) => [...prev, i]);
  };

  const handleReset = () => {
    setOrder([]);
    setChecked(false);
  };

  const handleCheck = () => {
    setChecked(true);
    onRecordAnswer({
      type: 'sentence_build',
      correct: JSON.stringify(order) === JSON.stringify(correctOrder),
      concept: screen.concept,
    });
  };

  const feedbackMax = checked ? (isCorrect ? screen.max_correct : screen.max_wrong) : null;

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
      <MaxBubble max={checked ? feedbackMax : screen.max} colors={colors} />
      {screen.prompt && (
        <Text style={{ color: colors.text, fontSize: 17, fontWeight: '700', marginHorizontal: 20, marginBottom: 16 }}>
          {screen.prompt}
        </Text>
      )}

      <View
        style={{
          minHeight: 56,
          marginHorizontal: 20,
          marginBottom: 16,
          padding: 12,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        {order.map((tileIndex, pos) => (
          <View
            key={pos}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 8,
              backgroundColor: colors.primary,
            }}
          >
            <Text style={{ color: colors.primaryText, fontWeight: '600' }}>{tiles[tileIndex]}</Text>
          </View>
        ))}
      </View>

      {!checked && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 20, marginBottom: 16 }}>
          {available.map((i) => (
            <Pressable
              key={i}
              onPress={() => handleTapTile(i)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 8,
                backgroundColor: colors.background,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text style={{ color: colors.text, fontWeight: '600' }}>{tiles[i]}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {checked && screen.explanation && (
        <View style={{ marginHorizontal: 20, marginBottom: 8, padding: 14, borderRadius: 12, backgroundColor: colors.surface }}>
          <Text style={{ color: colors.subtitle, fontSize: 14, lineHeight: 20 }}>{screen.explanation}</Text>
        </View>
      )}

      <View style={{ paddingHorizontal: 20 }}>
        {!checked ? (
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
            <Pressable onPress={handleReset} style={{ paddingVertical: 12, paddingHorizontal: 16 }}>
              <Text style={{ color: colors.subtitle, fontWeight: '600' }}>Effacer</Text>
            </Pressable>
            <View style={{ flex: 1 }}>
              <ContinueButton colors={colors} onPress={handleCheck} label="Valider" disabled={order.length !== tiles.length} />
            </View>
          </View>
        ) : isLast ? (
          <ContinueButton colors={colors} onPress={onFinish} label="Terminer la leçon" loading={isSubmitting} />
        ) : (
          <ContinueButton colors={colors} onPress={onNext} />
        )}
      </View>
    </ScrollView>
  );
}