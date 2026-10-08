// Ralentit artificiellement le chargement des données, pour voir les
// squelettes sur un réseau rapide. Actif en développement uniquement
// (__DEV__) : sans effet dans une version publiée. Mettre 0 pour désactiver.
export const DEV_SLOW_LOADING_MS = 0;

export function devSlowLoading(): Promise<void> {
  if (!__DEV__ || DEV_SLOW_LOADING_MS <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, DEV_SLOW_LOADING_MS));
}
