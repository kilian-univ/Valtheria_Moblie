// Tâches secondaires du démarrage (rappels, mesure, mémoire du parcours) :
// une erreur, qu'elle soit levée tout de suite ou plus tard (promesse
// rejetée), est avalée et ne peut jamais empêcher l'app de s'ouvrir.
// Fonction pure, sans React Native : testable avec Node.
export function runSafely(label: string, task: () => unknown): void {
  const warn = (err: unknown) => {
    if (typeof __DEV__ !== 'undefined' && __DEV__) console.warn(`[démarrage] ${label} ignoré`, err);
  };
  try {
    const result = task();
    if (result && typeof (result as Promise<unknown>).then === 'function') {
      (result as Promise<unknown>).then(undefined, warn);
    }
  } catch (err) {
    warn(err);
  }
}
