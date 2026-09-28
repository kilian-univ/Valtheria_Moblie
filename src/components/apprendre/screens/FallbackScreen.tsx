import { ScrollView, Text, View } from 'react-native';
import ContinueButton from '../ContinueButton';
import ValBubble from '../ValBubble';
import { LessonScreenProps } from '../types';

export default function FallbackScreen({ screen, colors, onNext, isLast, onFinish, isSubmitting }: LessonScreenProps) {
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
      <ValBubble val={screen.val?.intro} colors={colors} />
      <View style={{ marginHorizontal: 20, padding: 14, borderRadius: 12, backgroundColor: colors.surface }}>
        <Text style={{ color: colors.subtitle, fontSize: 12, marginBottom: 8 }}>
          Type d'écran pas encore géré : "{screen.type}"
        </Text>
        <Text style={{ color: colors.text, fontSize: 12, fontFamily: 'monospace' }}>
          {JSON.stringify(screen.payload, null, 2)}
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