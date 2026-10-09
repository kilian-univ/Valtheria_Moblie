import { useRouter } from 'expo-router';
import { useState } from 'react';

import { Lesson, useApi } from '@/src/context/ApiContext';
import { isNetworkError } from '@/src/hooks/useLearningData';
import { error as errorHaptic } from '@/src/utils/haptics';

// Lance une leçon : la démarre côté serveur à CHAQUE lancement, rejeu
// compris (chaque /start ouvre une partie que /complete consomme, sinon
// 403 not_started — API.md du site), puis ouvre le lecteur.
export function useLessonLauncher() {
  const { startLesson } = useApi();
  const router = useRouter();
  const [startingId, setStartingId] = useState<number | null>(null);
  const [launchError, setLaunchError] = useState<string | null>(null);

  const launch = async (lesson: Lesson): Promise<boolean> => {
    if (startingId !== null) return false;
    setStartingId(lesson.id);
    setLaunchError(null);
    try {
      await startLesson(lesson.id);
      router.push({ pathname: '/apprendre/[id]', params: { id: lesson.id } });
      return true;
    } catch (err) {
      errorHaptic();
      setLaunchError(
        isNetworkError(err)
          ? 'Impossible de lancer la leçon : pas de connexion internet.'
          : 'Impossible de lancer la leçon : le serveur ne répond pas.'
      );
      return false;
    } finally {
      setStartingId(null);
    }
  };

  return { launch, startingId, launchError };
}
