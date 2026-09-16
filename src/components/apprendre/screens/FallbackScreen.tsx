import { ScrollView, Text, View } from 'react-native';
import ContinueButton from '../ContinueButton';
import MaxBubble from '../MaxBubble';
import { LessonScreenProps } from '../types';

// Tout type non géré, affiché lisiblement sans planter l'app
export default function FallbackScreen({ screen, colors, onNext, isLast, onFinish, isSubmitting }: LessonScreenProps) {
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
      <MaxBubble max={screen.max} colors={colors} />
      <View style={{ marginHorizontal: 20, padding: 14, borderRadius: 12, backgroundColor: colors.surface }}>
        <Text style={{ color: colors.subtitle, fontSize: 12, marginBottom: 8 }}>
          Type d'écran non encore géré : "{screen.type}"
        </Text>
        <Text style={{ color: colors.text, fontSize: 13, fontFamily: 'monospace' }}>
          {JSON.stringify(screen, null, 2)}
        </Text>
      </View>
      {isLast ? (
        <ContinueButton colors={colors} onPress={onFinish} label="Terminer la leçon" loading={isSubmitting} />
      ) : (
        <ContinueButton colors={colors} onPress={onNext} />
      )}
    </ScrollView>
  );
}