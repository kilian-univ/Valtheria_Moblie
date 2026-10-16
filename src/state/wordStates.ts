import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useSyncExternalStore } from 'react';

import { markResult, markSeen, mergeWords, migrateDiscovered, parseWords, type WordMemory } from '@/src/utils/wordStates';
import { discoveredWordsStore } from './discoveredWords';
import { GUEST, type UserKey } from './userMemory';

// États des mots du Dictionnaire (vu, maîtrisé), par compte et sans compte
// (utils/wordStates). À la première lecture : les mots « découverts » des
// versions précédentes deviennent « Vus », et pour un compte, ce qui a été
// fait sans compte sur ce téléphone y est repris. Tout échec de stockage est
// ignoré.

const storageKey = (user: UserKey) => `valtheria:mots-etats:${user}`;
const cache = new Map<UserKey, WordMemory>();
const pending = new Map<UserKey, Promise<WordMemory>>();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

async function read(user: UserKey): Promise<WordMemory | null> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(user));
    return raw === null ? null : parseWords(JSON.parse(raw));
  } catch {
    return null;
  }
}

async function write(user: UserKey, memory: WordMemory): Promise<void> {
  try {
    await AsyncStorage.setItem(storageKey(user), JSON.stringify(memory));
  } catch {
    // stockage indisponible : sans conséquence
  }
}

export function loadWordStates(user: UserKey): Promise<WordMemory> {
  const known = cache.get(user);
  if (known) return Promise.resolve(known);
  const running = pending.get(user);
  if (running) return running;
  const job = (async () => {
    let memory = await read(user);
    if (memory === null) {
      // Première fois : mots découverts d'avant, et la mémoire sans compte
      memory = migrateDiscovered({}, await discoveredWordsStore.load(user).catch(() => []));
      if (user !== GUEST) memory = mergeWords(memory, (await read(GUEST)) ?? {});
      if (Object.keys(memory).length > 0) await write(user, memory);
    }
    cache.set(user, memory);
    pending.delete(user);
    emit();
    return memory;
  })();
  pending.set(user, job);
  return job;
}

// Les changements s'enchaînent (jamais deux écritures croisées)
let queue: Promise<unknown> = Promise.resolve();

function update(user: UserKey, change: (m: WordMemory) => WordMemory): Promise<void> {
  const job = queue.then(async () => {
    const current = await loadWordStates(user);
    const next = change(current);
    if (next === current) return;
    cache.set(user, next);
    emit();
    await write(user, next);
  });
  queue = job.catch(() => {});
  return job;
}

// Fiche ouverte : « Vu »
export function markWordSeen(user: UserKey, term: string): Promise<void> {
  return update(user, (m) => markSeen(m, term, new Date()));
}

// Test réussi : « Maîtrisé » ; raté : « Vu » (révision le lendemain)
export function recordWordResult(user: UserKey, term: string, correct: boolean): Promise<void> {
  return update(user, (m) => markResult(m, term, correct, new Date()));
}

export function useWordStates(user: UserKey): WordMemory | null {
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
    loadWordStates(user);
  }, [user]);
  return value;
}
