import { useEffect, useSyncExternalStore } from 'react';

import { loadErrorKind, type LoadError } from '@/src/utils/loadError';
import { readPortfolio, type Portfolio } from '@/src/utils/patrimoine/model';
import { remainingDelay, wait, withNetworkRetry } from '@/src/utils/retry';

// Portefeuille du compte, partagé entre Mon patrimoine, Un actif et Analyse :
// une seule requête à la fois, l'heure de la dernière mise à jour, et le
// format du serveur (`ledger` : routes du lot portefeuille disponibles).
// Rien n'est gardé sur le téléphone : chaque ouverture redemande. Un échec
// garde les dernières données de la session (status 'ready', error rempli).
// Échec du réseau : une seconde tentative, discrète, avant d'afficher
// l'erreur (au retour de l'arrière-plan, iOS coupe les requêtes en cours et
// la première qui suit peut échouer alors que le réseau fonctionne). Réponse
// illisible : une erreur du serveur, jamais « pas de connexion internet ».
// « Réessayer » depuis l'erreur : l'erreur reste affichée (retrying), sans
// squelette, jusqu'au résultat.

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
  // Nouvelle tentative demandée depuis l'erreur, en cours
  retrying: boolean;
  // Position à animer (après une opération enregistrée)
  pulse: { positionId: number; at: number } | null;
};

const EMPTY: State = {
  user: null,
  status: 'idle',
  ledger: false,
  portfolio: null,
  fetchedAt: null,
  error: null,
  errorKind: null,
  retrying: false,
  pulse: null,
};

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
  // Depuis l'erreur, sans données : l'erreur reste, le bouton dit « Nouvelle tentative… »
  const retrying = state.status === 'error' && !state.portfolio;
  const started = Date.now();
  if (retrying) set({ retrying: true });
  else set({ status: state.portfolio ? 'ready' : 'loading', error: null, errorKind: null });
  const job = withNetworkRetry(fetchPortfolio)
    .then((raw) => readPortfolio(raw))
    .then(({ ledger, portfolio }) => {
      if (state.user !== user) return;
      set({ status: 'ready', ledger, portfolio, fetchedAt: Date.now(), error: null, errorKind: null, retrying: false });
    })
    .catch((e: unknown) => {
      if (state.user !== user) return;
      const fail = () =>
        set({
          status: state.portfolio ? 'ready' : 'error',
          error: e instanceof Error ? e.message : 'Erreur',
          errorKind: loadErrorKind(e),
          retrying: false,
        });
      const left = retrying ? remainingDelay(started, Date.now()) : 0;
      if (left > 0) return wait(left).then(fail);
      fail();
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
