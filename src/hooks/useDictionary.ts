import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

import { devSlowLoading } from '@/src/constants/dev';
import { useApi } from '@/src/context/ApiContext';
import { isNetworkError, LoadError } from '@/src/hooks/useLearningData';
import { addRecentTerm, getFavoriteTerms, getRecentTerms, toggleFavoriteTerm } from '@/src/state/dictionaryMemory';
import { restoreWords, saveWords } from '@/src/state/learningCache';
import { DictionaryEntry, isFavorite, isUnauthorized, normalizeEntries, toggleFavorite } from '@/src/utils/dictionary';

// Mots chargés, partagés entre l'accueil et les fiches (une seule requête)
type State = { entries: DictionaryEntry[]; loaded: boolean };
let state: State = { entries: [], loaded: false };
// Mots demandés au serveur une fois dans la vie de l'app (la copie du
// téléphone, relue au lancement, ne compte pas)
let fetched = false;
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

// Mots du dictionnaire. Chargés au premier affichage de l'onglet (squelette
// jusque-là) ; gardés ensuite pour toute la vie de l'app : les mots déjà
// chargés restent affichés pendant un rechargement et hors ligne. Pour revoir
// le squelette en développement : DEV_SLOW_LOADING_MS (constants/dev) et un
// redémarrage de l'app (un rechargement à chaud garde les mots en mémoire).
export function useDictionary() {
  const { getDictionaryTerms, isAuthenticated, isLoading: authPending } = useApi();
  const { entries, loaded } = useSyncExternalStore(store.subscribe, store.getState);
  const [error, setError] = useState<DictionaryError | null>(null);

  const load = useCallback(async () => {
    try {
      await devSlowLoading();
      const fresh = normalizeEntries(await getDictionaryTerms());
      store.setState({ entries: fresh, loaded: true });
      fetched = true;
      saveWords(fresh);
      setError(null);
    } catch (err) {
      setError(isUnauthorized(err) ? 'reserved' : isNetworkError(err) ? 'network' : 'server');
    }
  }, [getDictionaryTerms]);

  useFocusEffect(
    useCallback(() => {
      if (!isAuthenticated || fetched) return;
      // Les mots du dernier lancement, le temps que le serveur réponde
      if (!store.getState().loaded) {
        restoreWords().then((saved) => {
          if (saved && !store.getState().loaded) store.setState({ entries: saved, loaded: true });
        });
      }
      load();
    }, [isAuthenticated, load])
  );

  // Déconnexion : on oublie les mots du compte précédent
  useEffect(() => {
    if (!authPending && !isAuthenticated && store.getState().loaded) {
      fetched = false;
      store.setState({ entries: [], loaded: false });
    }
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

// « Mes mots » de l'utilisateur, relus à chaque affichage. L'étoile change
// tout de suite à l'écran, puis la liste est enregistrée.
export function useDictionaryFavorites(userId: number | null | undefined) {
  const [favorites, setFavorites] = useState<string[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (userId === null || userId === undefined) return;
      let active = true;
      getFavoriteTerms(userId).then((terms) => {
        if (active) setFavorites(terms);
      });
      return () => {
        active = false;
      };
    }, [userId])
  );

  const toggle = useCallback(
    (term: string) => {
      if (userId === null || userId === undefined) return;
      setFavorites((current) => toggleFavorite(current, term));
      toggleFavoriteTerm(userId, term).then(setFavorites);
    },
    [userId]
  );

  const has = useCallback((term: string) => isFavorite(favorites, term), [favorites]);

  return { favorites, isFavorite: has, toggle };
}
