import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useSyncExternalStore } from 'react';

import { cleanMedalDays } from '@/src/utils/streakRewards';

// Récompenses de la série d'un compte connecté, par utilisateur, sur le
// téléphone : meilleure série atteinte (la série vient du serveur, qui ne la
// donne pas) et paliers déjà fêtés. Sans compte, tout vit dans la mémoire du
// parcours (state/onboarding).

export type RewardsRecord = { best: number; celebrated: number[] };

const EMPTY: RewardsRecord = { best: 0, celebrated: [] };
const keyFor = (userId: number | string) => `valtheria:recompenses-serie:${userId}`;

const records = new Map<string, RewardsRecord>();
const loading = new Map<string, Promise<RewardsRecord>>();
const listeners = new Set<() => void>();
let version = 0;

function emit() {
  version += 1;
  listeners.forEach((l) => l());
}

function parse(raw: string | null): RewardsRecord {
  try {
    const r = raw ? JSON.parse(raw) : null;
    const best = typeof r?.best === 'number' && Number.isInteger(r.best) && r.best > 0 ? r.best : 0;
    return { best, celebrated: cleanMedalDays(r?.celebrated) };
  } catch {
    return EMPTY;
  }
}

function save(id: string, record: RewardsRecord) {
  records.set(id, record);
  emit();
  AsyncStorage.setItem(keyFor(id), JSON.stringify(record)).catch(() => {
    // stockage indisponible : les médailles se recalculeront depuis la série
  });
}

export const streakRewardsStore = {
  // Déjà lu (sinon null) : utilisable tout de suite
  cached(userId: number | string): RewardsRecord | null {
    return records.get(String(userId)) ?? null;
  },
  load(userId: number | string): Promise<RewardsRecord> {
    const id = String(userId);
    const known = records.get(id);
    if (known) return Promise.resolve(known);
    const pending = loading.get(id);
    if (pending) return pending;
    const promise = AsyncStorage.getItem(keyFor(id))
      .then(parse, () => EMPTY)
      .then((record) => {
        // Une mise à jour arrivée pendant la lecture l'emporte
        const current = records.get(id);
        const merged = current
          ? { best: Math.max(current.best, record.best), celebrated: cleanMedalDays([...current.celebrated, ...record.celebrated]) }
          : record;
        records.set(id, merged);
        loading.delete(id);
        emit();
        return merged;
      });
    loading.set(id, promise);
    return promise;
  },
  // Série vue (accueil, fin de leçon) : la meilleure monte si besoin
  seeStreak(userId: number | string, streak: number) {
    const id = String(userId);
    const record = records.get(id) ?? EMPTY;
    if (streak > record.best) save(id, { ...record, best: streak });
  },
  markCelebrated(userId: number | string, days: readonly number[]) {
    const id = String(userId);
    const record = records.get(id) ?? EMPTY;
    const celebrated = cleanMedalDays([...record.celebrated, ...days]);
    if (celebrated.length !== record.celebrated.length) save(id, { ...record, celebrated });
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

// Meilleure série d'un compte (au moins la série en cours), mise à jour au fil
// des séries vues
export function useBestStreak(userId: number | string | null | undefined, streak: number): number {
  useSyncExternalStore(streakRewardsStore.subscribe, () => version);
  useEffect(() => {
    if (userId === null || userId === undefined) return;
    streakRewardsStore.load(userId).then(() => streakRewardsStore.seeStreak(userId, streak));
  }, [userId, streak]);
  const record = userId === null || userId === undefined ? null : streakRewardsStore.cached(userId);
  return Math.max(streak, record?.best ?? 0);
}
