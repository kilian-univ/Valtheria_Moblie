// Outils de cadence, sans React ni module natif : testables avec Node.
// Servent aux curseurs (glissements rapides) : valeur vivante partagée,
// regroupement au plus une fois par image, limitation de fréquence.

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

// Regroupement : des valeurs qui arrivent en rafale ne sont envoyées qu'une
// fois par image (la dernière) ; flush() envoie tout de suite la dernière
// en attente (fin de glissement : la valeur finale, exacte)
export type FrameBatch<T> = {
  push(value: T): void;
  flush(): void;
};

export function createFrameBatch<T>(send: (value: T) => void, schedule: (run: () => void) => void): FrameBatch<T> {
  let pending: { value: T } | null = null;
  let scheduled = false;
  const flush = () => {
    const p = pending;
    pending = null;
    if (p) send(p.value);
  };
  return {
    push(value) {
      pending = { value };
      if (scheduled) return;
      scheduled = true;
      schedule(() => {
        scheduled = false;
        flush();
      });
    },
    flush,
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
