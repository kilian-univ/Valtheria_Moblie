import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import {
  addCelebratedModuleId,
  getCelebratedModuleIds,
  getLastModuleId,
  setLastModuleId,
} from '@/src/state/lastModule';

// Mémoire locale de l'utilisateur : dernier module ouvert et modules déjà
// fêtés. Relue à chaque affichage (la page module a pu la changer).
export function useLearningMemory(userId: number | null | undefined) {
  const [lastModuleId, setLast] = useState<number | null>(null);
  const [celebrated, setCelebrated] = useState<number[]>([]);
  const [ready, setReady] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (userId === null || userId === undefined) return;
      let active = true;
      Promise.all([getLastModuleId(userId), getCelebratedModuleIds(userId)]).then(([last, ids]) => {
        if (!active) return;
        setLast(last);
        setCelebrated(ids);
        setReady(true);
      });
      return () => {
        active = false;
      };
    }, [userId])
  );

  const markOpened = useCallback(
    (moduleId: number) => {
      if (userId === null || userId === undefined) return;
      setLastModuleId(userId, moduleId);
    },
    [userId]
  );

  const markCelebrated = useCallback(
    (moduleId: number) => {
      if (userId === null || userId === undefined) return;
      addCelebratedModuleId(userId, moduleId);
    },
    [userId]
  );

  return { lastModuleId, celebrated, ready, markOpened, markCelebrated };
}
