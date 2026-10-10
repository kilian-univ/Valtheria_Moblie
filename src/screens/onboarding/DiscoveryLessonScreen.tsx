import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo } from 'react';

import { discoveryLesson, toObjective } from '@/src/lesson/discovery';
import ApprendreDetailScreen from '@/src/screens/ApprendreDetailScreen';
import { onboardingStore, useOnboarding } from '@/src/state/onboarding';
import { withPlayed } from '@/src/utils/onboarding';
import { track } from '@/src/utils/track';

// Leçon découverte, jouée dans le lecteur de leçon : corrigée sur le
// téléphone, rien n'est envoyé au serveur. Première ouverture : la leçon de
// l'objectif choisi. Depuis l'accueil sans compte (depuis=accueil) : la
// leçon de la tuile touchée, sans toucher à l'étape du parcours.
export default function DiscoveryLessonScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ objectif?: string; depuis?: string }>();
  const { state } = useOnboarding();
  const fromHome = params.depuis === 'accueil';
  const objective = (fromHome ? toObjective(params.objectif) : null) ?? state.objective;
  const lesson = useMemo(() => discoveryLesson(objective), [objective]);

  useEffect(() => {
    track('decouverte_commencee', { objectif: objective, depuis: fromHome ? 'accueil' : 'premiere-ouverture' });
  }, [objective, fromHome]);

  const onFinished = useCallback(() => {
    track('decouverte_terminee', { objectif: objective });
    const played = objective ? withPlayed(onboardingStore.get().state.played, objective) : onboardingStore.get().state.played;
    if (fromHome) {
      onboardingStore.update({ played });
      router.replace({ pathname: '/bienvenue/fin', params: { objectif: objective ?? '', depuis: 'accueil' } });
      return;
    }
    onboardingStore.update({ played, step: 'fin' });
    router.replace('/bienvenue/fin');
  }, [objective, fromHome, router]);

  const discovery = useMemo(() => ({ lesson, onFinished }), [lesson, onFinished]);

  return <ApprendreDetailScreen discovery={discovery} />;
}
