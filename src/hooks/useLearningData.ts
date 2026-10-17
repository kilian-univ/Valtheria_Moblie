import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

import { devSlowLoading } from '@/src/constants/dev';
import { Module, Progress, useApi } from '@/src/context/ApiContext';
import type { Universe } from '@/src/lesson/model';
import { learningStore } from '@/src/state/learningStore';
import { isNetworkError, type LoadError } from '@/src/utils/loadError';
import { fetchUniverses } from '@/src/utils/universes';

export type { LoadError } from '@/src/utils/loadError';
export { isNetworkError } from '@/src/utils/loadError';

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
  const { get, getModules, getProgress, isAuthenticated, isLoading: authPending } = useApi();
  const store = useSyncExternalStore(learningStore.subscribe, learningStore.getState);
  const [error, setError] = useState<LoadError | null>(null);

  const load = useCallback(async () => {
    try {
      await devSlowLoading();
      // Univers en même temps que les modules. Leur échec (route pas encore
      // déployée, erreur) ne bloque rien : on garde les derniers connus, ou
      // aucun, et l'accueil montre alors la liste des modules.
      const [modules, progress, universes]: [Module[], Progress, Universe[] | null] = await Promise.all([
        getModules(),
        getProgress(),
        fetchUniverses(get),
      ]);
      learningStore.setState({
        modules: Array.isArray(modules) ? modules : [],
        universes: universes ?? learningStore.getState().universes,
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
  }, [get, getModules, getProgress]);

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
      learningStore.setState({ modules: [], universes: [], xp: 0, streak: 0, level: 1, vals: 0, loaded: false });
    }
  }, [authPending, isAuthenticated]);

  return {
    modules: store.modules,
    universes: store.universes,
    xp: store.xp,
    streak: store.streak,
    level: store.level,
    vals: store.vals,
    isAuthenticated,
    authPending,
    // Modules et chiffres (série, Vals) vraiment reçus : sans cela, jamais
    // de « 0 » affiché comme une vraie valeur
    loaded: store.loaded,
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
