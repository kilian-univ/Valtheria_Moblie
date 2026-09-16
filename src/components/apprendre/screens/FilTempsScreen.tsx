import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import ChoiceButton from '../ChoiceButton';
import ContinueButton from '../ContinueButton';
import MaxBubble from '../MaxBubble';
import { Choice, LessonScreenProps } from '../types';

// fil_temps — étapes défilables + question finale (choix simple)
export default function FilTempsScreen({ screen, colors, onNext, isLast, onFinish, isSubmitting }: LessonScreenProps) {
  const etapes: any[] = screen.etapes ?? [];
  const questionFinale = screen.question_finale;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const finalChoices: Choice[] = questionFinale?.choices ?? [];
  const selected = finalChoices.find((c) => c.id === selectedId);

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
      <MaxBubble max={screen.max} colors={colors} />
      {screen.titre && (
        <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800', marginHorizontal: 20, marginBottom: 8 }}>
          {screen.titre}
        </Text>
      )}
      {screen.intro && (
        <Text style={{ color: colors.subtitle, fontSize: 14, marginHorizontal: 20, marginBottom: 16, lineHeight: 20 }}>
          {screen.intro}
        </Text>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}>
        {etapes.map((etape, i) => (
          <View
            key={i}
            style={{
              width: 220,
              padding: 16,
              borderRadius: 14,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700', marginBottom: 6 }}>{etape.age}</Text>
            <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700', marginBottom: 6 }}>{etape.titre}</Text>
            <Text style={{ color: colors.subtitle, fontSize: 13, lineHeight: 18 }}>{etape.texte}</Text>
          </View>
        ))}
      </ScrollView>

      {questionFinale && (
        <>
          <Text style={{ color: colors.text, fontSize: 17, fontWeight: '700', marginHorizontal: 20, marginTop: 24, marginBottom: 16 }}>
            {questionFinale.prompt}
          </Text>
          <View style={{ paddingHorizontal: 20 }}>
            {finalChoices.map((choice) => (
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
        </>
      )}

      {isLast ? (
        <ContinueButton
          colors={colors}
          onPress={onFinish}
          label="Terminer la leçon"
          disabled={!!questionFinale && !selectedId}
          loading={isSubmitting}
        />
      ) : (
        <ContinueButton colors={colors} onPress={onNext} disabled={!!questionFinale && !selectedId} />
      )}
    </ScrollView>
  );
}