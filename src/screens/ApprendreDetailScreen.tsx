import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ScreenRenderer from '@/src/components/apprendre/ScreenRenderer';
import { CollectedAnswer, Screen } from '@/src/components/apprendre/types';
import { palette } from '@/src/constants/style/Style';
import { useApi } from '@/src/context/ApiContext';
import { useTheme } from '@/src/context/ThemeContext';

export default function ApprendreDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const { getLesson, completeLesson } = useApi();

  const [screens, setScreens] = useState<Screen[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<CollectedAnswer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('APPRENDRE DETAIL — id reçu depuis la navigation:', id);

    if (!id) {
      console.log('APPRENDRE DETAIL — aucun id, on arrête ici.');
      setIsLoading(false);
      return;
    }

    getLesson(Number(id))
      .then((data: any) => {
        console.log('LEÇON COMPLÈTE REÇUE:', JSON.stringify(data, null, 2));
        // Le JSON reçu peut être soit { screens: [...] }, soit directement le tableau
        const resolvedScreens = Array.isArray(data) ? data : data.screens ?? [];
        console.log(`APPRENDRE DETAIL — ${resolvedScreens.length} écran(s) résolu(s).`);
        setScreens(resolvedScreens);
      })
      .catch((err: any) => {
        console.log('ERREUR LEÇON:', err.message);
        setError(err.message || 'Leçon introuvable.');
      })
      .finally(() => setIsLoading(false));
  }, [id]);

  const current = screens[index];
  const progress = screens.length > 0 ? (index + 1) / screens.length : 0;

  const goNext = () => {
    if (index < screens.length - 1) setIndex((i) => i + 1);
  };

  const recordAnswer = (a: CollectedAnswer) => {
    setAnswers((prev) => [...prev, a]);
  };

  const handleFinish = async () => {
    if (!id) return;
    setIsSubmitting(true);
    try {
      const correct = answers.filter((a) => a.correct).length;
      await completeLesson(Number(id), {
        answers: answers.length > 0 ? answers : undefined,
        correct_answers: answers.length > 0 ? undefined : correct,
        total_questions: answers.length > 0 ? undefined : Math.max(1, answers.length),
      });
      router.back();
    } catch (err: any) {
      setError(err.message || 'Impossible de valider la leçon.');
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (error || !current) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <Text style={{ color: colors.error, textAlign: 'center', marginBottom: 16 }}>
          {error || 'Leçon introuvable.'}
        </Text>
        <Pressable onPress={() => router.back()}>
          <Text style={{ color: colors.primary, fontWeight: '600' }}>Retour</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['bottom']}>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: 12,
          }}
        >
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Text style={{ color: colors.text, fontSize: 20 }}>✕</Text>
          </Pressable>
          <View style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.surface, overflow: 'hidden' }}>
            <View
              style={{
                height: '100%',
                width: `${progress * 100}%`,
                backgroundColor: colors.primary,
                borderRadius: 4,
              }}
            />
          </View>
        </View>

        <ScreenRenderer
          screen={current}
          screenIndex={index}
          colors={colors}
          onNext={goNext}
          onRecordAnswer={recordAnswer}
          isLast={index === screens.length - 1}
          onFinish={handleFinish}
          isSubmitting={isSubmitting}
        />
      </View>
    </SafeAreaView>
  );
}