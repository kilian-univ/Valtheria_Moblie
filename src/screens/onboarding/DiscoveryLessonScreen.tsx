import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo } from 'react';

import { discoveryLesson, toObjective } from '@/src/lesson/discovery';
import ApprendreDetailScreen from '@/src/screens/ApprendreDetailScreen';
import { onboardingStore, useOnboarding } from '@/src/state/onboarding';
import { recordLessonDone } from '@/src/utils/discoveryHome';
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
    // Leçon et jour de série mémorisés ; la fin de leçon reçoit la série
    // d'avant (flamme qui grandit) et, la sixième fois, la célébration
    const done = recordLessonDone(onboardingStore.get().state, objective);
    const params = {
      serie: String(done.streakFrom),
      ...(done.celebrateSix ? { six: '1' } : {}),
      ...(done.medal ? { medaille: String(done.medal.days) } : {}),
      ...(done.freezeGained ? { gel: '1' } : {}),
    };
    if (fromHome) {
      onboardingStore.update(done.patch);
      router.replace({ pathname: '/bienvenue/fin', params: { ...params, objectif: objective ?? '', depuis: 'accueil' } });
      return;
    }
    onboardingStore.update({ ...done.patch, step: 'fin' });
    router.replace({ pathname: '/bienvenue/fin', params });
  }, [objective, fromHome, router]);

  const discovery = useMemo(() => ({ lesson, onFinished }), [lesson, onFinished]);

  return <ApprendreDetailScreen discovery={discovery} />;
}
