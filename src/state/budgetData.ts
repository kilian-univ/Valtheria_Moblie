import { useEffect, useSyncExternalStore } from 'react';

import { parseBudget, type Budget } from '@/src/utils/budget/model';
import { loadErrorKind, type LoadError } from '@/src/utils/loadError';

// Budget du compte (GET /budget), partagé entre Mon budget, la mise en route,
// le Cash-flow et le bilan : une seule requête à la fois. Rien n'est gardé sur
// le téléphone : chaque ouverture redemande ; un échec garde les dernières
// données de la session. Les écritures passent par le serveur, puis le
// budget est relu.

type State = {
  user: string | null;
  status: 'idle' | 'loading' | 'ready' | 'error';
  budget: Budget | null;
  fetchedAt: number | null;
  errorKind: LoadError | null;
};

const EMPTY: State = { user: null, status: 'idle', budget: null, fetchedAt: null, errorKind: null };

let state: State = EMPTY;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
let running: { user: string; job: Promise<void> } | null = null;

function set(next: Partial<State>) {
  state = { ...state, ...next };
  emit();
}

// `get` : la lecture générique de la couche API (useApi().get)
export function loadBudget(user: string, get: (path: string) => Promise<unknown>, force = false): Promise<void> {
  if (state.user !== user) state = { ...EMPTY, user };
  if (running && running.user === user) return running.job;
  if (!force && state.status === 'ready' && state.fetchedAt && Date.now() - state.fetchedAt < 30_000) return Promise.resolve();
  set({ status: state.budget ? 'ready' : 'loading', errorKind: null });
  const job = get('/budget')
    .then((raw) => {
      if (state.user !== user) return;
      set({ status: 'ready', budget: parseBudget(raw), fetchedAt: Date.now(), errorKind: null });
    })
    .catch((e: unknown) => {
      if (state.user !== user) return;
      set({ status: state.budget ? 'ready' : 'error', errorKind: loadErrorKind(e) });
    })
    .finally(() => {
      if (running?.job === job) running = null;
    });
  running = { user, job };
  return job;
}

// Réponse complète du serveur (mise en route) : prise telle quelle
export function setBudget(user: string, raw: unknown) {
  if (state.user !== user) return;
  set({ status: 'ready', budget: parseBudget(raw), fetchedAt: Date.now(), errorKind: null });
}

export function clearBudget() {
  state = EMPTY;
  emit();
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

export function useBudgetState(): State {
  return useSyncExternalStore(subscribe, () => state);
}

// Charge à l'ouverture d'un écran (sans relancer si les données sont récentes)
export function useBudget(user: string | null, get: (path: string) => Promise<unknown>): State {
  const value = useBudgetState();
  useEffect(() => {
    if (user) loadBudget(user, get);
  }, [user, get]);
  return value;
}
