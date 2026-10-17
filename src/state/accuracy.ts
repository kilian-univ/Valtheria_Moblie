import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useSyncExternalStore } from 'react';

import {
  type AccuracyRecord,
  applyLesson,
  type Challenge,
  EMPTY_ACCURACY,
  mergeAccuracy,
  parseAccuracy,
} from '@/src/utils/accuracy';
import { GUEST, type UserKey } from './userMemory';

// Précision, par compte et sans compte : meilleures séries d'affilée, leçons
// parfaites, défis gagnés (utils/accuracy). À la première lecture d'un
// compte, ce qui a été gagné sans compte sur ce téléphone y est repris. Tout
// échec de stockage est ignoré.

const storageKey = (user: UserKey) => `valtheria:precision:${user}`;
const cache = new Map<UserKey, AccuracyRecord>();
const pending = new Map<UserKey, Promise<AccuracyRecord>>();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

async function read(user: UserKey): Promise<AccuracyRecord | null> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(user));
    return raw === null ? null : parseAccuracy(JSON.parse(raw));
  } catch {
    return null;
  }
}

async function write(user: UserKey, record: AccuracyRecord): Promise<void> {
  try {
    await AsyncStorage.setItem(storageKey(user), JSON.stringify(record));
  } catch {
    // stockage indisponible : sans conséquence
  }
}

export function loadAccuracy(user: UserKey): Promise<AccuracyRecord> {
  const known = cache.get(user);
  if (known) return Promise.resolve(known);
  const running = pending.get(user);
  if (running) return running;
  const job = (async () => {
    let record = await read(user);
    if (record === null && user !== GUEST) {
      const guest = await read(GUEST);
      record = mergeAccuracy(EMPTY_ACCURACY, guest ?? EMPTY_ACCURACY);
      if (record.bestRun > 0 || record.earned.length > 0) await write(user, record);
      // Reprise une seule fois : un autre compte du téléphone ne la recevra pas
      if (guest) {
        cache.delete(GUEST);
        await AsyncStorage.removeItem(storageKey(GUEST)).catch(() => {});
      }
    }
    const out = record ?? EMPTY_ACCURACY;
    cache.set(user, out);
    pending.delete(user);
    emit();
    return out;
  })();
  pending.set(user, job);
  return job;
}

// Fin d'une leçon (du serveur ou découverte) : mémoire mise à jour, et les
// défis gagnés à l'instant (à fêter en fin de leçon)
export async function recordLessonAccuracy(
  user: UserKey,
  lesson: { key: string; bestRun: number; perfect: boolean }
): Promise<Challenge[]> {
  const current = await loadAccuracy(user);
  const { record, gained } = applyLesson(current, lesson);
  cache.set(user, record);
  emit();
  await write(user, record);
  return gained;
}

export function useAccuracy(user: UserKey): AccuracyRecord | null {
  const value = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
    () => cache.get(user) ?? null
  );
  useEffect(() => {
    loadAccuracy(user);
  }, [user]);
  return value;
}
