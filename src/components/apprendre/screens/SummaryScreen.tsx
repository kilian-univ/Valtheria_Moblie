import { ScrollView, Text, View } from 'react-native';
import ContinueButton from '../ContinueButton';
import MaxBubble from '../MaxBubble';
import RichText from '../RichText';
import { LessonScreenProps } from '../types';

export default function SummaryScreen({ screen, colors, onFinish, isSubmitting }: LessonScreenProps) {
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 40, flexGrow: 1, justifyContent: 'center' }}>
      <MaxBubble max={screen.max} colors={colors} />
      {screen.phrase && (
        <View style={{ marginHorizontal: 20, marginBottom: 16 }}>
          <RichText text={screen.phrase} colors={colors} size={16} />
        </View>
      )}
      {screen.fil_rouge && (
        <View style={{ marginHorizontal: 20, marginBottom: 8, padding: 14, borderRadius: 12, backgroundColor: colors.surface }}>
          <Text style={{ color: colors.subtitle, fontSize: 13, lineHeight: 19, fontStyle: 'italic' }}>{screen.fil_rouge}</Text>
        </View>
      )}
      <ContinueButton colors={colors} onPress={onFinish} label={screen.action || 'Terminer la leçon'} loading={isSubmitting} />
    </ScrollView>
  );
}