import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useSyncExternalStore } from 'react';

import type { CachedLesson, DailyPlan, RawScreen, SeenHistory, ServerRevision } from '@/src/utils/revision';
import { gradableScreens, recordLessonResults } from '@/src/utils/revision';
import type { UserKey } from './userMemory';

// Mémoire de la révision quotidienne, par compte, sur le téléphone :
// - les écrans notés des leçons terminées (relus par l'API au besoin) ;
// - le dernier passage de chaque écran et déclic (date, résultat) ;
// - les révisions des derniers jours (celle du jour reste la même) : celles
//   tirées par l'app, et celles du serveur (session, déclics ajoutés, fin).
// Tout échec de stockage est ignoré : la révision repart de zéro.

export type RevisionMemory = {
  lessons: Record<string, CachedLesson>;
  history: SeenHistory;
  plans: DailyPlan[];
  servers: ServerRevision[];
};

const EMPTY: RevisionMemory = { lessons: {}, history: {}, plans: [], servers: [] };
// Révisions gardées : aujourd'hui et la veille suffisent
const PLANS_KEPT = 3;

const storageKey = (user: UserKey) => `valtheria:revision:${user}`;
const cache = new Map<UserKey, RevisionMemory>();
const pending = new Map<UserKey, Promise<RevisionMemory>>();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function parse(raw: string | null): RevisionMemory {
  if (!raw) return EMPTY;
  try {
    const v = JSON.parse(raw) as Partial<RevisionMemory>;
    return {
      lessons: v.lessons && typeof v.lessons === 'object' ? v.lessons : {},
      history: v.history && typeof v.history === 'object' ? v.history : {},
      plans: Array.isArray(v.plans) ? v.plans.filter((p) => p && typeof p.day === 'string' && Array.isArray(p.items)) : [],
      servers: Array.isArray(v.servers)
        ? v.servers.filter((r) => r && typeof r.day === 'string' && typeof r.fetchedAt === 'string' && Array.isArray(r.extras))
        : [],
    };
  } catch {
    return EMPTY;
  }
}

export function loadRevisionMemory(user: UserKey): Promise<RevisionMemory> {
  const known = cache.get(user);
  if (known) return Promise.resolve(known);
  const running = pending.get(user);
  if (running) return running;
  const job = (async () => {
    let memory = EMPTY;
    try {
      memory = parse(await AsyncStorage.getItem(storageKey(user)));
    } catch {
      // stockage indisponible : mémoire vide
    }
    cache.set(user, memory);
    pending.delete(user);
    emit();
    return memory;
  })();
  pending.set(user, job);
  return job;
}

// Les modifications s'enchaînent (jamais deux écritures croisées)
let queue: Promise<unknown> = Promise.resolve();

export function updateRevisionMemory(user: UserKey, change: (m: RevisionMemory) => RevisionMemory): Promise<void> {
  const job = queue.then(async () => {
    const current = await loadRevisionMemory(user);
    const next = change(current);
    if (next === current) return;
    const byDay = <T extends { day: string }>(list: T[]) => [...list].sort((a, b) => (a.day < b.day ? -1 : 1)).slice(-PLANS_KEPT);
    const trimmed = { ...next, plans: byDay(next.plans), servers: byDay(next.servers) };
    cache.set(user, trimmed);
    emit();
    try {
      await AsyncStorage.setItem(storageKey(user), JSON.stringify(trimmed));
    } catch {
      // stockage indisponible : sans conséquence
    }
  });
  queue = job.catch(() => {});
  return job;
}

export function useRevisionMemory(user: UserKey): RevisionMemory | null {
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
    loadRevisionMemory(user);
  }, [user]);
  return value;
}

// Écrans notés d'une leçon (forme du serveur), gardés pour la révision
export function cachedLesson(
  lessonId: number,
  data: unknown,
  universeSlug: string | null,
  at: string
): CachedLesson {
  const d = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
  const screens: RawScreen[] | unknown = Array.isArray(data) ? data : d.screens;
  return {
    lessonId,
    title: typeof d.title === 'string' ? d.title : null,
    universeSlug,
    screens: gradableScreens(screens),
    at,
  };
}

// Fin d'une leçon jouée : ses écrans gardés, le premier essai de chacun noté
export function rememberLesson(
  user: UserKey,
  lesson: CachedLesson,
  results: readonly { index: number; correct: boolean }[]
): Promise<void> {
  return updateRevisionMemory(user, (m) => ({
    ...m,
    lessons: { ...m.lessons, [String(lesson.lessonId)]: lesson },
    history: recordLessonResults(m.history, lesson.lessonId, results, lesson.at),
  }));
}
