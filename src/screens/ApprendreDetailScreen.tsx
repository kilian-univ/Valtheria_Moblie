import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import LessonEndScreen from '@/src/components/apprendre/LessonEndScreen';
import ScreenRenderer from '@/src/components/apprendre/ScreenRenderer';
import { CollectedAnswer, Screen } from '@/src/components/apprendre/types';
import { getLessonPlayerStyles, palette } from '@/src/constants/style/Style';
import { useApi } from '@/src/context/ApiContext';
import { useTheme } from '@/src/context/ThemeContext';
import { learningStore } from '@/src/state/learningStore';

export default function ApprendreDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const styles = getLessonPlayerStyles(colorScheme);
  const { getLesson, completeLesson, getModules, getProgress } = useApi();

  const [screens, setScreens] = useState<Screen[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<CollectedAnswer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
  if (!id) {
    setIsLoading(false);
    return;
  }

  getLesson(Number(id))
    .then((data: any) => {
      const resolvedScreens = Array.isArray(data) ? data : data.screens ?? [];

      // DIAGNOSTIC : résumé de la leçon + JSON complet des types pas encore construits
      console.log(
        `LEÇON ${id} — "${data.title}" — types d'écrans :`,
        resolvedScreens.map((s: any) => s.type).join(', ')
      );

      const HANDLED = ['reveal', 'choice', 'HANDLED '];
      resolvedScreens
        .filter((s: any) => !HANDLED.includes(s.type))
        .forEach((s: any, i: number) => {
          console.log(`ÉCRAN NON GÉRÉ [${s.type}] #${i}:`, JSON.stringify(s, null, 2));
        });

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
    if (!id || isSubmitting) return;
    setIsSubmitting(true);

    try {
      // Format attendu : { "<index d'écran>": [tentative1, tentative2, ...] }
      // Seuls les écrans notés sont envoyés (reveal & co. n'ont pas de verdict).
      const responses: Record<string, any[]> = {};
      answers.forEach((a) => {
        if (!screens[a.screenIndex]?.scored) return;
        const key = String(a.screenIndex);
        if (!responses[key]) responses[key] = [];
        responses[key].push(a.raw);
      });

      const res = await completeLesson(Number(id), { responses });
      console.log('COMPLETE RÉSULTAT:', JSON.stringify(res, null, 2));

      // 1. Instantané : XP et série viennent directement de la réponse de /complete
      if (res?.user) {
        learningStore.setState({ xp: res.user.xp, streak: res.user.streak });
      }

      // 2. En tâche de fond pendant que l'utilisateur lit l'écran de fin :
      //    la leçon terminée et la suivante débloquée seront prêtes au retour.
      Promise.all([getModules(), getProgress()])
        .then(([modulesData, progressData]) => {
          learningStore.setState({
            modules: modulesData,
            streak: progressData?.streak ?? 0,
            xp: progressData?.xp ?? 0,
          });
        })
        .catch(() => {});

      setResult(res);
    } catch (err: any) {
      console.log('ERREUR COMPLETE:', err.message);
      setError(err.message || 'Impossible de valider la leçon.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (result) {
    return <LessonEndScreen result={result} colors={colors} onClose={() => router.back()} />;
  }

  if (error || !current) {
    return (
      <View style={styles.centeredPadded}>
        <Text style={styles.errorText}>{error || 'Leçon introuvable.'}</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backLink}>Retour</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <View style={styles.container}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Text style={styles.closeIcon}>✕</Text>
          </Pressable>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
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