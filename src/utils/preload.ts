// Préchargement d'images au démarrage. Fonction pure, sans React Native :
// testable avec Node. Elle ne rejette jamais : une image qui échoue (ou un
// chargeur qui lève tout de suite) est ignorée, et au bout de `maxWait` on
// continue sans attendre la suite.

export type PreloadOutcome = 'loaded' | 'partial' | 'timeout';

export function preloadAll<T>(
  sources: readonly T[],
  load: (source: T) => Promise<unknown>,
  maxWait: number
): Promise<PreloadOutcome> {
  const attempts = sources.map((source) => {
    try {
      return Promise.resolve(load(source)).then(
        () => true,
        () => false
      );
    } catch {
      return Promise.resolve(false);
    }
  });
  const all = Promise.all(attempts).then((results): PreloadOutcome => (results.every(Boolean) ? 'loaded' : 'partial'));
  const cap = new Promise<PreloadOutcome>((resolve) => setTimeout(() => resolve('timeout'), maxWait));
  return Promise.race([all, cap]);
}
