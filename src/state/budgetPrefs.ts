import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useSyncExternalStore } from 'react';

import type { BalanceMark, SavingsDone } from '@/src/utils/budget/calc';
import type { UserKey } from './userMemory';

// Mémoire du budget sur le téléphone, par compte (effacée à la déconnexion :
// la clé finit par l'identifiant) : repère du dernier relevé fait ici, bilans
// déjà proposés, étapes déjà fêtées. Tout échec de stockage est ignoré.

export type BudgetPrefs = {
  mark: BalanceMark | null;
  // Mois (« 2026-09 ») dont le bilan a déjà été proposé à l'ouverture
  reviewsShown: string[];
  // Étapes du budget déjà fêtées (clé → date)
  milestones: Record<string, string>;
  // Épargne du mois confirmée faite (« <id>:<date> » → jour de la confirmation)
  savingsDone: SavingsDone;
};

const EMPTY: BudgetPrefs = { mark: null, reviewsShown: [], milestones: {}, savingsDone: {} };

function parse(raw: unknown): BudgetPrefs {
  const r = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const m = r.mark && typeof r.mark === 'object' ? (r.mark as Record<string, unknown>) : null;
  return {
    mark: m && typeof m.on === 'string' && typeof m.maxEntryId === 'number' ? { on: m.on, maxEntryId: m.maxEntryId } : null,
    reviewsShown: Array.isArray(r.reviewsShown) ? r.reviewsShown.filter((x): x is string => typeof x === 'string') : [],
    milestones:
      r.milestones && typeof r.milestones === 'object'
        ? Object.fromEntries(Object.entries(r.milestones as Record<string, unknown>).filter((e): e is [string, string] => typeof e[1] === 'string'))
        : {},
    savingsDone:
      r.savingsDone && typeof r.savingsDone === 'object'
        ? Object.fromEntries(Object.entries(r.savingsDone as Record<string, unknown>).filter((e): e is [string, string] => typeof e[1] === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(e[1])))
        : {},
  };
}

const storageKey = (user: UserKey) => `valtheria:budget:${user}`;
const cache = new Map<UserKey, BudgetPrefs>();
const pending = new Map<UserKey, Promise<BudgetPrefs>>();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function loadBudgetPrefs(user: UserKey): Promise<BudgetPrefs> {
  const known = cache.get(user);
  if (known) return Promise.resolve(known);
  const running = pending.get(user);
  if (running) return running;
  const job = (async () => {
    let prefs = EMPTY;
    try {
      const raw = await AsyncStorage.getItem(storageKey(user));
      prefs = parse(raw === null ? null : JSON.parse(raw));
    } catch {
      // illisible : mémoire vide
    }
    cache.set(user, prefs);
    pending.delete(user);
    emit();
    return prefs;
  })();
  pending.set(user, job);
  return job;
}

let queue: Promise<unknown> = Promise.resolve();

export function updateBudgetPrefs(user: UserKey, change: (p: BudgetPrefs) => BudgetPrefs): Promise<void> {
  const job = queue.then(async () => {
    const current = await loadBudgetPrefs(user);
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

export function useBudgetPrefs(user: UserKey): BudgetPrefs | null {
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
    loadBudgetPrefs(user);
  }, [user]);
  return value;
}

export function clearBudgetPrefs() {
  cache.clear();
  emit();
}
