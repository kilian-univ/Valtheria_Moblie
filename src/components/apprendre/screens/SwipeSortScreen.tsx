import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import ContinueButton from '../ContinueButton';
import MaxBubble from '../MaxBubble';
import { LessonScreenProps } from '../types';

// swipe_sort — items classés (simplifié en tap gauche/droite plutôt que swipe)
export default function SwipeSortScreen({ screen, colors, onNext, isLast, onFinish, isSubmitting }: LessonScreenProps) {
  const items: any[] = screen.items ?? [];
  const [itemIndex, setItemIndex] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const item = items[itemIndex];
  const done = itemIndex >= items.length;

  const handleChoice = () => {
    if (!item) return;
    setFeedback(item.feedback ?? null);
  };

  const handleNextItem = () => {
    setFeedback(null);
    setItemIndex((i) => i + 1);
  };

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
      <MaxBubble max={screen.max} colors={colors} />
      {screen.prompt && (
        <Text style={{ color: colors.text, fontSize: 17, fontWeight: '700', marginHorizontal: 20, marginBottom: 20 }}>
          {screen.prompt}
        </Text>
      )}

      {!done && item && (
        <View style={{ marginHorizontal: 20 }}>
          <View
            style={{
              padding: 20,
              borderRadius: 14,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
              marginBottom: 16,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600', textAlign: 'center' }}>
              {item.label}
            </Text>
          </View>

          {!feedback ? (
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Pressable
                onPress={handleChoice}
                style={{ flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
              >
                <Text style={{ color: colors.text, fontWeight: '600' }}>{screen.left_label ?? 'Non'}</Text>
              </Pressable>
              <Pressable
                onPress={handleChoice}
                style={{ flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', backgroundColor: colors.primary }}
              >
                <Text style={{ color: colors.primaryText, fontWeight: '600' }}>{screen.right_label ?? 'Oui'}</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <View style={{ padding: 14, borderRadius: 12, backgroundColor: colors.surface, marginBottom: 12 }}>
                <Text style={{ color: colors.subtitle, fontSize: 14, lineHeight: 20 }}>{feedback}</Text>
              </View>
              <ContinueButton colors={colors} onPress={handleNextItem} label={itemIndex === items.length - 1 ? 'Voir le résumé' : 'Suivant'} />
            </>
          )}
        </View>
      )}

      {done && (
        <View style={{ paddingHorizontal: 20 }}>
          {screen.explanation && (
            <View style={{ padding: 14, borderRadius: 12, backgroundColor: colors.surface, marginBottom: 8 }}>
              <Text style={{ color: colors.subtitle, fontSize: 14, lineHeight: 20 }}>{screen.explanation}</Text>
            </View>
          )}
          {isLast ? (
            <ContinueButton colors={colors} onPress={onFinish} label="Terminer la leçon" loading={isSubmitting} />
          ) : (
            <ContinueButton colors={colors} onPress={onNext} />
          )}
        </View>
      )}
    </ScrollView>
  );
}