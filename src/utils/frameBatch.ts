// Outils de cadence, sans React ni module natif : testables avec Node.
// Servent aux curseurs (glissements rapides) : valeur vivante partagée,
// limitation de fréquence (vibrations). Les écrans qui redessinent pendant
// un glissement le font sur le fil d'interface (lot 8), plus en JavaScript.

// Valeur vivante : lue et écoutée sans passer par l'état d'un écran entier
// (le grand chiffre du pari s'abonne seul et se re-rend seul)
export type LiveValue<T> = {
  get(): T;
  set(value: T): void;
  subscribe(listener: () => void): () => void;
};

export function createLiveValue<T>(initial: T): LiveValue<T> {
  let value = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => value,
    set(next) {
      if (Object.is(next, value)) return;
      value = next;
      listeners.forEach((l) => l());
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

// Limitation de fréquence : au plus un passage toutes les `minGap` ms
export function createThrottle(minGap: number, now: () => number): () => boolean {
  let last: number | null = null;
  return () => {
    const t = now();
    if (last !== null && t - last < minGap) return false;
    last = t;
    return true;
  };
}
