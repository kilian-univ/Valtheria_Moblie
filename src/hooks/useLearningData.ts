import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

import { devSlowLoading } from '@/src/constants/dev';
import { Module, Progress, useApi } from '@/src/context/ApiContext';
import { learningStore } from '@/src/state/learningStore';

export type LoadError = 'network' | 'server';

// fetch lève un TypeError ("Network request failed") quand il n'y a pas de
// réseau ; toute autre erreur vient du serveur.
export function isNetworkError(err: unknown): boolean {
  if (err instanceof TypeError) return true;
  const message = err instanceof Error ? err.message : '';
  return /network|internet|offline|timed? ?out/i.test(message);
}

// Aucun texte anglais ni technique à l'écran
export function loadErrorMessage(kind: LoadError): string {
  return kind === 'network'
    ? 'Impossible de charger tes leçons : pas de connexion internet.'
    : 'Impossible de charger tes leçons : le serveur ne répond pas.';
}

export const OFFLINE_BANNER = 'Pas de connexion internet. Tes leçons déjà chargées restent visibles.';
export const OFFLINE_REASON = 'Connecte-toi à internet pour lancer une leçon.';

// Modules et progression de l'onglet Apprendre. Recharge à chaque affichage
// de l'écran ; les données déjà chargées (learningStore, partagé avec le
// lecteur de leçon) restent affichées pendant le rechargement et hors ligne.
export function useLearningData() {
  const { getModules, getProgress, isAuthenticated, isLoading: authPending } = useApi();
  const store = useSyncExternalStore(learningStore.subscribe, learningStore.getState);
  const [error, setError] = useState<LoadError | null>(null);

  const load = useCallback(async () => {
    try {
      await devSlowLoading();
      const [modules, progress]: [Module[], Progress] = await Promise.all([getModules(), getProgress()]);
      learningStore.setState({
        modules: Array.isArray(modules) ? modules : [],
        xp: progress?.xp ?? 0,
        streak: progress?.streak ?? 0,
        level: progress?.level ?? 1,
        vals: progress?.vals ?? 0,
        loaded: true,
      });
      setError(null);
    } catch (err) {
      setError(isNetworkError(err) ? 'network' : 'server');
    }
  }, [getModules, getProgress]);

  // Dès que le token est lu sur le téléphone (isAuthenticated) : on n'attend
  // pas la vérification du profil en réseau (/user), qui se fait en parallèle.
  useFocusEffect(
    useCallback(() => {
      if (!isAuthenticated) return;
      load();
    }, [isAuthenticated, load])
  );

  // Déconnexion : on oublie les données du compte précédent
  useEffect(() => {
    if (!authPending && !isAuthenticated && learningStore.getState().loaded) {
      learningStore.setState({ modules: [], xp: 0, streak: 0, level: 1, vals: 0, loaded: false });
    }
  }, [authPending, isAuthenticated]);

  return {
    modules: store.modules,
    xp: store.xp,
    streak: store.streak,
    level: store.level,
    vals: store.vals,
    isAuthenticated,
    authPending,
    // Rien à montrer encore : squelette (token pas encore lu, ou premières
    // données en route)
    isLoading: (authPending && !isAuthenticated) || (isAuthenticated && !store.loaded && error === null),
    // Erreur bloquante : aucune donnée à afficher
    error: store.loaded ? null : error,
    // Données déjà là mais réseau perdu : bandeau + lancements bloqués
    offline: store.loaded && error === 'network',
    reload: load,
  };
}
