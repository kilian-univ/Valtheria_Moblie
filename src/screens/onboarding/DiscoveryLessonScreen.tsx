import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo } from 'react';

import { discoveryLesson, toObjective } from '@/src/lesson/discovery';
import ApprendreDetailScreen from '@/src/screens/ApprendreDetailScreen';
import { onboardingStore, useOnboarding } from '@/src/state/onboarding';
import { withLessonDay } from '@/src/utils/discoveryHome';
import { withPlayed } from '@/src/utils/onboarding';
import { track } from '@/src/utils/track';

// Leçon découverte, jouée dans le lecteur de leçon : corrigée sur le
// téléphone, rien n'est envoyé au serveur. Première ouverture : la leçon de
// l'objectif choisi. Depuis l'accueil sans compte (depuis=accueil) : la
// leçon de la carte ou de la feuille « Un autre sujet », sans toucher à
// l'étape du parcours. Commencée, terminée et jour de série : mémorisés.
export default function DiscoveryLessonScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ objectif?: string; depuis?: string }>();
  const { state } = useOnboarding();
  const fromHome = params.depuis === 'accueil';
  const objective = (fromHome ? toObjective(params.objectif) : null) ?? state.objective;
  const lesson = useMemo(() => discoveryLesson(objective), [objective]);

  useEffect(() => {
    track('decouverte_commencee', { objectif: objective, depuis: fromHome ? 'accueil' : 'premiere-ouverture' });
    if (objective) onboardingStore.update({ started: withPlayed(onboardingStore.get().state.started, objective) });
  }, [objective, fromHome]);

  const onFinished = useCallback(() => {
    track('decouverte_terminee', { objectif: objective });
    const current = onboardingStore.get().state;
    const played = objective ? withPlayed(current.played, objective) : current.played;
    const lessonDays = withLessonDay(current.lessonDays);
    if (fromHome) {
      onboardingStore.update({ played, lessonDays });
      router.replace({ pathname: '/bienvenue/fin', params: { objectif: objective ?? '', depuis: 'accueil' } });
      return;
    }
    onboardingStore.update({ played, lessonDays, step: 'fin' });
    router.replace('/bienvenue/fin');
  }, [objective, fromHome, router]);

  const discovery = useMemo(() => ({ lesson, onFinished }), [lesson, onFinished]);

  return <ApprendreDetailScreen discovery={discovery} />;
}
