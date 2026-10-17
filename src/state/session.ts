import { useCallback, useSyncExternalStore } from 'react';

import { useApi } from '@/src/context/ApiContext';
import { loadErrorKind, type LoadError } from '@/src/utils/loadError';

// Profil du compte quand il manque : jeton présent sur le téléphone, mais
// /user n'a pas répondu au démarrage (pas de réseau, serveur en panne). Sans
// reprise, le profil n'arrivait jamais : Profil et Patrimoine restaient en
// chargement sans fin. SessionRecovery (layout racine) relance cette lecture
// au démarrage, au retour au premier plan et à intervalle régulier ; les
// écrans affichent l'erreur et proposent « Réessayer ».

type State = { status: 'idle' | 'loading' | 'error'; kind: LoadError | null };

let state: State = { status: 'idle', kind: null };
const listeners = new Set<() => void>();
let running: Promise<void> | null = null;

function set(next: State) {
  state = next;
  listeners.forEach((l) => l());
}

export function recoverProfile(refreshUser: () => Promise<unknown>): Promise<void> {
  if (running) return running;
  set({ status: 'loading', kind: state.kind });
  running = refreshUser()
    .then(() => set({ status: 'idle', kind: null }))
    .catch((e: unknown) => set({ status: 'error', kind: loadErrorKind(e) }))
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
  return { user, profile, errorKind: s.kind ?? 'server', retryProfile };
}
