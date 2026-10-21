// Nouvelles tentatives de chargement, sans React : testables avec Node.

import { isNetworkError } from './loadError';

// Seconde tentative après un échec du réseau
export const NETWORK_RETRY_MS = 800;
// « Nouvelle tentative… » reste affiché au moins ce temps : un échec
// immédiat ne fait pas clignoter le bouton
export const RETRY_MIN_MS = 700;

export const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// Une requête, et une seconde, discrète, après un échec du réseau seulement :
// au retour de l'arrière-plan, iOS coupe les requêtes en cours, et la
// première qui suit peut échouer alors que le réseau fonctionne (lot 7)
export function withNetworkRetry<T>(run: () => Promise<T>, delay = NETWORK_RETRY_MS, pause: (ms: number) => Promise<void> = wait): Promise<T> {
  return run().catch((e: unknown) => {
    if (!isNetworkError(e)) throw e;
    return pause(delay).then(run);
  });
}

// Temps à attendre encore pour qu'un état ait duré au moins `min` ms
export function remainingDelay(startedAt: number, now: number, min = RETRY_MIN_MS): number {
  return Math.max(0, min - (now - startedAt));
}
