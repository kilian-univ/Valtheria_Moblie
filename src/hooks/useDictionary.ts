import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

import { useApi } from '@/src/context/ApiContext';
import { isNetworkError, LoadError } from '@/src/hooks/useLearningData';
import { addRecentTerm, getRecentTerms } from '@/src/state/dictionaryRecents';
import { DictionaryEntry, isUnauthorized, normalizeEntries } from '@/src/utils/dictionary';

// Mots chargés, partagés entre l'accueil et les fiches (une seule requête)
type State = { entries: DictionaryEntry[]; loaded: boolean };
let state: State = { entries: [], loaded: false };
const listeners = new Set<() => void>();
const store = {
  getState: () => state,
  setState(patch: Partial<State>) {
    state = { ...state, ...patch };
    listeners.forEach((l) => l());
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

// Erreur bloquante, ou 'reserved' : pas de compte (401), l'onglet invite à en
// créer un, sans message d'erreur
export type DictionaryError = LoadError | 'reserved';

// Mots du dictionnaire. Chargés au premier affichage de l'onglet ; les mots
// déjà chargés restent affichés pendant un rechargement et hors ligne.
export function useDictionary() {
  const { getDictionaryTerms, isAuthenticated, isLoading: authPending } = useApi();
  const { entries, loaded } = useSyncExternalStore(store.subscribe, store.getState);
  const [error, setError] = useState<DictionaryError | null>(null);

  const load = useCallback(async () => {
    try {
      store.setState({ entries: normalizeEntries(await getDictionaryTerms()), loaded: true });
      setError(null);
    } catch (err) {
      setError(isUnauthorized(err) ? 'reserved' : isNetworkError(err) ? 'network' : 'server');
    }
  }, [getDictionaryTerms]);

  useFocusEffect(
    useCallback(() => {
      if (!isAuthenticated || store.getState().loaded) return;
      load();
    }, [isAuthenticated, load])
  );

  // Déconnexion : on oublie les mots du compte précédent
  useEffect(() => {
    if (!authPending && !isAuthenticated && store.getState().loaded) store.setState({ entries: [], loaded: false });
  }, [authPending, isAuthenticated]);

  const signedOut = !authPending && !isAuthenticated;
  const blocking = loaded ? null : error;

  return {
    entries,
    // Squelette : token pas encore lu, ou premiers mots en route
    isLoading: !signedOut && !loaded && error === null,
    reserved: signedOut || blocking === 'reserved',
    error: blocking === 'reserved' ? null : blocking,
    offline: loaded && error === 'network',
    reload: load,
  };
}

// Récemment consultés de l'utilisateur, relus à chaque affichage
export function useDictionaryRecents(userId: number | null | undefined) {
  const [recents, setRecents] = useState<string[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (userId === null || userId === undefined) return;
      let active = true;
      getRecentTerms(userId).then((terms) => {
        if (active) setRecents(terms);
      });
      return () => {
        active = false;
      };
    }, [userId])
  );

  const addRecent = useCallback(
    (term: string) => {
      if (userId === null || userId === undefined) return;
      addRecentTerm(userId, term);
    },
    [userId]
  );

  return { recents, addRecent };
}
