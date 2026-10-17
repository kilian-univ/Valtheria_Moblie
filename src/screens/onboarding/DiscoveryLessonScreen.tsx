import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useApi } from '@/src/context/ApiContext';
import { DISCOVERY, discoveryLesson, toObjective } from '@/src/lesson/discovery';
import { recordLessonAccuracy } from '@/src/state/accuracy';
import { learningStore } from '@/src/state/learningStore';
import { addToNotebook } from '@/src/state/notebook';
import { getRegulatoryFigures } from '@/src/state/regulatoryFigures';
import { recordLessonXp } from '@/src/state/weekJournal';
import { userKeyOf } from '@/src/state/userMemory';
import ApprendreDetailScreen from '@/src/screens/ApprendreDetailScreen';
import { onboardingStore, useOnboarding } from '@/src/state/onboarding';
import { recordLessonDone } from '@/src/utils/discoveryHome';
import { withPlayed } from '@/src/utils/onboarding';
import { bestRunOf, isPerfectLesson } from '@/src/utils/accuracy';
import type { LessonSummary } from '@/src/utils/lessonPlayer';
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
  // Chiffres réglementaires pris une fois, à l'ouverture : la leçon ne change
  // pas en cours de route si de nouveaux chiffres arrivent
  const [figures] = useState(getRegulatoryFigures);
  const lesson = useMemo(() => discoveryLesson(objective, figures), [objective, figures]);
  const { user } = useApi();

  useEffect(() => {
    track('decouverte_commencee', { objectif: objective, depuis: fromHome ? 'accueil' : 'premiere-ouverture' });
    if (objective) onboardingStore.update({ started: withPlayed(onboardingStore.get().state.started, objective) });
  }, [objective, fromHome]);

  const onFinished = useCallback(async (summary: LessonSummary, results: { index: number; correct: boolean }[]) => {
    track('decouverte_terminee', { objectif: objective });
    // Le déclic du document entre au carnet (une seule fois), avec l'univers
    // conseillé (nom du serveur s'il est chargé)
    if (objective && lesson.takeawayMarked) {
      const plan = DISCOVERY[objective].universe;
      const known = learningStore.getState().universes.find((u) => u.slug === plan.slug);
      addToNotebook(userKeyOf(user?.id), {
        text: lesson.takeawayMarked,
        universeSlug: plan.slug,
        universeName: known?.name ?? plan.name,
        lessonTitle: lesson.title,
        at: new Date().toISOString(),
      }).catch(() => {});
    }
    // Leçon et jour de série mémorisés ; la fin de leçon reçoit la série
    // d'avant (flamme qui grandit) et, la sixième fois, la célébration
    const done = recordLessonDone(onboardingStore.get().state, objective);
    // Journal de la semaine (graphique du profil) : les XP comptés sur le téléphone
    recordLessonXp(userKeyOf(user?.id), done.xpGained).catch(() => {});
    // Précision gardée sur le téléphone (sans compte aussi) ; les défis
    // gagnés sont fêtés à la fin
    const bestRun = bestRunOf(results);
    const perfect = isPerfectLesson(summary);
    const challenges = await recordLessonAccuracy(userKeyOf(user?.id), {
      key: `decouverte-${objective ?? 'decouvrir'}`,
      bestRun,
      perfect,
    }).catch(() => []);
    const params = {
      serie: String(done.streakFrom),
      meilleure: String(bestRun),
      ...(perfect ? { parfaite: '1' } : {}),
      ...(challenges.length > 0 ? { defis: challenges.map((c) => c.id).join(',') } : {}),
      // Bilan de la leçon (premier écran de la fin)
      justes: String(summary.correct),
      total: String(summary.total),
      rattrapees: String(summary.recovered),
      xp: String(done.xpGained),
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
  }, [objective, fromHome, router, lesson, user?.id]);

  const discovery = useMemo(() => ({ lesson, onFinished }), [lesson, onFinished]);

  return <ApprendreDetailScreen discovery={discovery} />;
}
