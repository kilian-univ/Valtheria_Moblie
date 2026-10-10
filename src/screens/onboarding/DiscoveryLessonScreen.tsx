import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo } from 'react';

import { discoveryLesson } from '@/src/lesson/discovery';
import ApprendreDetailScreen from '@/src/screens/ApprendreDetailScreen';
import { onboardingStore, useOnboarding } from '@/src/state/onboarding';
import { track } from '@/src/utils/track';

// Leçon découverte de l'objectif choisi, jouée dans le lecteur de leçon :
// corrigée sur le téléphone, rien n'est envoyé au serveur
export default function DiscoveryLessonScreen() {
  const router = useRouter();
  const { state } = useOnboarding();
  const objective = state.objective;
  const lesson = useMemo(() => discoveryLesson(objective), [objective]);

  useEffect(() => {
    track('decouverte_commencee', { objectif: objective });
  }, [objective]);

  const onFinished = useCallback(() => {
    track('decouverte_terminee', { objectif: objective });
    onboardingStore.update({ step: 'fin' });
    router.replace('/bienvenue/fin');
  }, [objective, router]);

  const discovery = useMemo(() => ({ lesson, onFinished }), [lesson, onFinished]);

  return <ApprendreDetailScreen discovery={discovery} />;
}
