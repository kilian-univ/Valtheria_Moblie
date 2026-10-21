import { useCallback, useSyncExternalStore } from 'react';

import { useApi } from '@/src/context/ApiContext';
import { loadErrorKind, type LoadError } from '@/src/utils/loadError';
import { remainingDelay, wait, withNetworkRetry } from '@/src/utils/retry';

// Profil du compte quand il manque : jeton présent sur le téléphone, mais
// /user n'a pas répondu au démarrage (pas de réseau, serveur en panne). Sans
// reprise, le profil n'arrivait jamais : Profil et Patrimoine restaient en
// chargement sans fin. SessionRecovery (layout racine) relance cette lecture
// au démarrage, au retour au premier plan et à intervalle régulier ; les
// écrans affichent l'erreur et proposent « Réessayer ». Une nouvelle
// tentative depuis l'erreur garde l'erreur affichée (retrying), sans
// squelette ; un échec du réseau est retenté une fois, discrètement.

type State = { status: 'idle' | 'loading' | 'error'; kind: LoadError | null; retrying: boolean };

let state: State = { status: 'idle', kind: null, retrying: false };
const listeners = new Set<() => void>();
let running: Promise<void> | null = null;

function set(next: State) {
  state = next;
  listeners.forEach((l) => l());
}

export function recoverProfile(refreshUser: () => Promise<unknown>): Promise<void> {
  if (running) return running;
  const retrying = state.status === 'error';
  const started = Date.now();
  set(retrying ? { ...state, retrying: true } : { status: 'loading', kind: state.kind, retrying: false });
  running = withNetworkRetry(refreshUser)
    .then(() => set({ status: 'idle', kind: null, retrying: false }))
    .catch((e: unknown) => {
      const fail = () => set({ status: 'error', kind: loadErrorKind(e), retrying: false });
      const left = retrying ? remainingDelay(started, Date.now()) : 0;
      if (left > 0) return wait(left).then(fail);
      fail();
    })
    .finally(() => {
      running = null;
    });
  return running;
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

export type ProfileView = 'pending' | 'guest' | 'loading' | 'error' | 'ready';

// Où en est le profil : pending (jeton pas encore lu), guest (sans compte),
// loading, error (avec son type), ready
export function useSession() {
  const { user, isAuthenticated, isLoading, refreshUser } = useApi();
  const s = useSyncExternalStore(subscribe, () => state);
  const retryProfile = useCallback(() => recoverProfile(refreshUser), [refreshUser]);
  const profile: ProfileView = isLoading
    ? 'pending'
    : !isAuthenticated
      ? 'guest'
      : user
        ? 'ready'
        : s.status === 'error'
          ? 'error'
          : 'loading';
  return { user, profile, errorKind: s.kind ?? 'server', profileRetrying: s.retrying, retryProfile };
}
