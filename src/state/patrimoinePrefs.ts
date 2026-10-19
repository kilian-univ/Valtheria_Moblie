import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useSyncExternalStore } from 'react';

import { hasRetiredKeys, parsePrefs, type PatrimoinePrefs } from '@/src/utils/patrimoine/prefs';
import type { UserKey } from './userMemory';

// Préférences du suivi de patrimoine, sur le téléphone, par compte : mode
// discret, objectifs, étapes, versements sur les livrets
// (utils/patrimoine/prefs.ts). Tout échec de stockage est ignoré.

const storageKey = (user: UserKey) => `valtheria:patrimoine:${user}`;
const cache = new Map<UserKey, PatrimoinePrefs>();
const pending = new Map<UserKey, Promise<PatrimoinePrefs>>();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function loadPatrimoinePrefs(user: UserKey): Promise<PatrimoinePrefs> {
  const known = cache.get(user);
  if (known) return Promise.resolve(known);
  const running = pending.get(user);
  if (running) return running;
  const job = (async () => {
    let prefs = parsePrefs(null);
    try {
      const raw = await AsyncStorage.getItem(storageKey(user));
      const parsed: unknown = raw === null ? null : JSON.parse(raw);
      prefs = parsePrefs(parsed);
      // Une option retirée (échelle logarithmique) : réécrites sans elle, une fois
      if (hasRetiredKeys(parsed)) await AsyncStorage.setItem(storageKey(user), JSON.stringify(prefs));
    } catch {
      // illisible : préférences par défaut
    }
    cache.set(user, prefs);
    pending.delete(user);
    emit();
    return prefs;
  })();
  pending.set(user, job);
  return job;
}

// Les changements s'enchaînent (jamais deux écritures croisées)
let queue: Promise<unknown> = Promise.resolve();

export function updatePatrimoinePrefs(user: UserKey, change: (p: PatrimoinePrefs) => PatrimoinePrefs): Promise<void> {
  const job = queue.then(async () => {
    const current = await loadPatrimoinePrefs(user);
    const next = change(current);
    if (next === current) return;
    cache.set(user, next);
    emit();
    try {
      await AsyncStorage.setItem(storageKey(user), JSON.stringify(next));
    } catch {
      // stockage indisponible : sans conséquence
    }
  });
  queue = job.catch(() => {});
  return job;
}

export function usePatrimoinePrefs(user: UserKey): PatrimoinePrefs | null {
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
    loadPatrimoinePrefs(user);
  }, [user]);
  return value;
}
