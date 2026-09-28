import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import ContinueButton from '../ContinueButton';
import ValBubble from '../ValBubble';
import { LessonScreenProps } from '../types';

// choice — QCM à réponse unique (single) ou multiple (multiple). Noté.
export default function ChoiceScreen({ screen, screenIndex, colors, onNext, onRecordAnswer, isLast, onFinish, isSubmitting }: LessonScreenProps) {
  const { payload } = screen;
  const isMultiple = payload.mode === 'multiple';
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [answered, setAnswered] = useState(false);

    useEffect(() => {
        setSelectedIds([]);
        setAnswered(false);
    }, [screenIndex]);

  const correctIds: string[] = payload.options.filter((o: any) => o.correct).map((o: any) => o.id);
  const isFullyCorrect =
    selectedIds.length === correctIds.length && correctIds.every((id) => selectedIds.includes(id));

  const toggle = (optionId: string) => {
    if (answered) return;
    if (isMultiple) {
      setSelectedIds((prev) => (prev.includes(optionId) ? prev.filter((id) => id !== optionId) : [...prev, optionId]));
    } else {
      setSelectedIds([optionId]);
    }
  };

  const handleValidate = () => {
    if (selectedIds.length === 0 || answered) return;
    setAnswered(true);
    onRecordAnswer({
      screenIndex,
      type: 'choice',
      notion: screen.notion,
      correct: isFullyCorrect,
      raw: isMultiple ? selectedIds : selectedIds[0],
    });
  };

  const feedbackVal = answered ? (isFullyCorrect ? screen.val.correct : screen.val.wrong) : screen.val.intro;

  return (
    <ScrollView style={{ flex: 1, paddingBottom: 24 }}>
      <ValBubble val={feedbackVal} colors={colors} />

      {payload.subtitle && (
        <Text style={{ color: colors.subtitle, fontSize: 13, marginHorizontal: 20, marginBottom: 8, lineHeight: 18 }}>
          {payload.subtitle}
        </Text>
      )}

      <Text style={{ color: colors.text, fontSize: 17, fontWeight: '700', marginHorizontal: 20, marginBottom: 16 }}>
        {payload.question}
      </Text>

      <View style={{ paddingHorizontal: 20 }}>
        {payload.options.map((option: any) => {
          const isSelected = selectedIds.includes(option.id);

          let backgroundColor = colors.surface;
          let borderColor = colors.border;

          if (answered) {
            if (option.correct) {
              backgroundColor = colors.success + '22';
              borderColor = colors.success;
            } else if (isSelected && !option.correct) {
              backgroundColor = colors.error + '22';
              borderColor = colors.error;
            }
          } else if (isSelected) {
            backgroundColor = colors.primary + '22';
            borderColor = colors.primary;
          }

          return (
            <Pressable
              key={option.id}
              onPress={() => toggle(option.id)}
              disabled={answered}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                borderWidth: 1.5,
                borderColor,
                backgroundColor,
                borderRadius: 12,
                paddingVertical: 14,
                paddingHorizontal: 16,
                marginBottom: 10,
              }}
            >
              {isMultiple && (
                <View
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 4,
                    borderWidth: 1.5,
                    borderColor: isSelected ? colors.primary : colors.subtitle,
                    backgroundColor: isSelected ? colors.primary : 'transparent',
                  }}
                />
              )}
              <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600', flex: 1 }}>{option.text}</Text>
            </Pressable>
          );
        })}
      </View>

      {!answered ? (
        <ContinueButton colors={colors} onPress={handleValidate} label="Valider" disabled={selectedIds.length === 0} />
      ) : (
        <>
          {screen.explanation && (
            <View style={{ marginHorizontal: 20, marginTop: 4, marginBottom: 8, padding: 14, borderRadius: 12, backgroundColor: colors.surface }}>
              <Text style={{ color: colors.subtitle, fontSize: 14, lineHeight: 20 }}>{screen.explanation}</Text>
            </View>
          )}
          {isLast ? (
            <ContinueButton colors={colors} onPress={onFinish} label="Terminer la leçon" loading={isSubmitting} />
          ) : (
            <ContinueButton colors={colors} onPress={onNext} />
          )}
        </>
      )}
    </ScrollView>
  );
}