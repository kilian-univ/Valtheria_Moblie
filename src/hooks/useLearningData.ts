import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

import { devSlowLoading } from '@/src/constants/dev';
import { Module, Progress, useApi } from '@/src/context/ApiContext';
import type { Universe } from '@/src/lesson/model';
import { EMPTY_LEARNING, learningStore } from '@/src/state/learningStore';
import { restoreLearning, saveLearning } from '@/src/state/learningCache';
import { isNetworkError, type LoadError } from '@/src/utils/loadError';
import { streakFieldsOf } from '@/src/utils/streakServer';
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
// État du magasin après un chargement réussi (hors du try : le compilateur
// React saute le hook si un try/catch contient une condition)
function loadedState(modules: Module[], progress: Progress, universes: Universe[] | null, knownUniverses: Universe[]) {
  return {
    modules: Array.isArray(modules) ? modules : [],
    universes: universes ?? knownUniverses,
    xp: progress?.xp ?? 0,
    streak: progress?.streak ?? 0,
    level: progress?.level ?? 1,
    vals: progress?.vals ?? 0,
    loaded: true,
    // Gels en réserve, record, gel utilisé hier (serveur du 20/10/2026 ou plus récent)
    ...streakFieldsOf(progress),
  };
}
const loadErrorOf = (err: unknown): LoadError => (isNetworkError(err) ? 'network' : 'server');

export function useLearningData() {
  const { get, getModules, getProgress, isAuthenticated, isLoading: authPending, user } = useApi();
  const userId: number | undefined = user?.id;
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
      learningStore.setState(loadedState(modules, progress, universes, learningStore.getState().universes));
      // Gardé pour le prochain lancement (contenu d'apprentissage seulement)
      saveLearning(userId);
      setError(null);
    } catch (err) {
      setError(loadErrorOf(err));
    }
  }, [get, getModules, getProgress, userId]);

  // Dès que le token est lu sur le téléphone (isAuthenticated) : on n'attend
  // pas la vérification du profil en réseau (/user), qui se fait en parallèle.
  useFocusEffect(
    useCallback(() => {
      if (!isAuthenticated) return;
      // Les derniers modules connus, le temps que le serveur réponde
      restoreLearning(userId);
      load();
    }, [isAuthenticated, load, userId])
  );

  // Déconnexion : on oublie les données du compte précédent
  useEffect(() => {
    if (!authPending && !isAuthenticated && learningStore.getState().loaded) {
      learningStore.setState(EMPTY_LEARNING);
    }
  }, [authPending, isAuthenticated]);

  return {
    modules: store.modules,
    universes: store.universes,
    xp: store.xp,
    streak: store.streak,
    level: store.level,
    vals: store.vals,
    streakFreezes: store.streakFreezes,
    streakBest: store.streakBest,
    streakFrozenYesterday: store.streakFrozenYesterday,
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

// Modules et univers déjà chargés (par l'onglet Apprendre ou le lecteur),
// sans relancer de requête : pour les écrans qui ne font que les lire
// (remarque de Val du patrimoine, carnet)
export function useLearningSnapshot() {
  const store = useSyncExternalStore(learningStore.subscribe, learningStore.getState);
  return { modules: store.modules, universes: store.universes };
}
