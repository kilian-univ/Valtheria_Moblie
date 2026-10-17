import { useEffect, useSyncExternalStore } from 'react';

import { loadErrorKind, type LoadError } from '@/src/utils/loadError';
import { parsePortfolio, supportsLedger, type Portfolio } from '@/src/utils/patrimoine/model';

// Portefeuille du compte, partagé entre Mon patrimoine, Un actif et Analyse :
// une seule requête à la fois, l'heure de la dernière mise à jour, et le
// format du serveur (`ledger` : routes du lot portefeuille disponibles).
// Rien n'est gardé sur le téléphone : chaque ouverture redemande. Un échec
// garde les dernières données de la session (status 'ready', error rempli).

export type PatrimoineStatus = 'idle' | 'loading' | 'ready' | 'error';

type State = {
  user: string | null;
  status: PatrimoineStatus;
  ledger: boolean;
  portfolio: Portfolio | null;
  fetchedAt: number | null;
  error: string | null;
  // Type du dernier échec : réseau absent ou serveur en panne
  errorKind: LoadError | null;
  // Position à animer (après une opération enregistrée)
  pulse: { positionId: number; at: number } | null;
};

const EMPTY: State = { user: null, status: 'idle', ledger: false, portfolio: null, fetchedAt: null, error: null, errorKind: null, pulse: null };

let state: State = EMPTY;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
let running: { user: string; job: Promise<void> } | null = null;

function set(next: Partial<State>) {
  state = { ...state, ...next };
  emit();
}

// Relit le portefeuille ; `fetchPortfolio` est getPortfolio de la couche API
export function loadPatrimoine(user: string, fetchPortfolio: () => Promise<unknown>, force = false): Promise<void> {
  if (state.user !== user) state = { ...EMPTY, user };
  if (running && running.user === user) return running.job;
  if (!force && state.status === 'ready' && state.fetchedAt && Date.now() - state.fetchedAt < 60_000) return Promise.resolve();
  set({ status: state.portfolio ? 'ready' : 'loading', error: null, errorKind: null });
  const job = fetchPortfolio()
    .then((raw) => {
      if (state.user !== user) return;
      set({ status: 'ready', ledger: supportsLedger(raw), portfolio: parsePortfolio(raw), fetchedAt: Date.now(), error: null, errorKind: null });
    })
    .catch((e: unknown) => {
      if (state.user !== user) return;
      set({ status: state.portfolio ? 'ready' : 'error', error: e instanceof Error ? e.message : 'Erreur', errorKind: loadErrorKind(e) });
    })
    .finally(() => {
      if (running?.job === job) running = null;
    });
  running = { user, job };
  return job;
}

export function markPositionPulse(positionId: number) {
  set({ pulse: { positionId, at: Date.now() } });
}

export function clearPatrimoine() {
  state = EMPTY;
  emit();
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

export function usePatrimoineState(): State {
  return useSyncExternalStore(subscribe, () => state);
}

// Charge à l'ouverture de l'écran (sans relancer si les données ont moins d'une minute)
export function usePatrimoine(user: string | null, fetchPortfolio: () => Promise<unknown>): State {
  const value = usePatrimoineState();
  useEffect(() => {
    if (user) loadPatrimoine(user, fetchPortfolio);
  }, [user, fetchPortfolio]);
  return value;
}
