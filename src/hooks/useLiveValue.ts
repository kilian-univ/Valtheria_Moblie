import { ReactNode, useEffect, useState, useSyncExternalStore } from 'react';

import { createFrameBatch, createLiveValue, createTrailingThrottle, type LiveValue } from '@/src/utils/frameBatch';

// Une valeur vivante propre au composant (créée une fois)
export function useLiveStore<T>(initial: T): LiveValue<T> {
  const [store] = useState(() => createLiveValue(initial));
  return store;
}

// Lecture à chaque changement : seul le composant abonné se re-rend
export function useLiveValue<T>(store: LiveValue<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}

// Lecture regroupée : au plus un rendu par image, sur la dernière valeur
// (courbe du simulateur, barre de la paie, répliques…)
export function useFrameValue<T>(store: LiveValue<T>): T {
  const [value, setValue] = useState(store.get);
  useEffect(() => {
    const batch = createFrameBatch<T>(setValue, (run) => {
      requestAnimationFrame(run);
    });
    // Valeur changée entre le rendu et l'abonnement
    batch.push(store.get());
    return store.subscribe(() => batch.push(store.get()));
  }, [store]);
  return value;
}

// Lecture à cadence limitée : au plus un rendu toutes les `minGap` ms, la
// dernière valeur jamais perdue (courbe et montants du simulateur : environ
// 30 fois par seconde pendant un glissement, sans charger le fil JavaScript)
export function useThrottledValue<T>(store: LiveValue<T>, minGap: number): T {
  const [value, setValue] = useState(store.get);
  useEffect(() => {
    const throttle = createTrailingThrottle<T>(
      setValue,
      minGap,
      () => Date.now(),
      (run, ms) => setTimeout(run, ms),
      (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>)
    );
    // Valeur changée entre le rendu et l'abonnement
    throttle.push(store.get());
    const unsubscribe = store.subscribe(() => throttle.push(store.get()));
    return () => {
      unsubscribe();
      throttle.cancel();
    };
  }, [store, minGap]);
  return value;
}

// Composant isolé qui affiche une valeur vivante (grand chiffre du pari)
export function Live<T>({ store, children }: { store: LiveValue<T>; children: (value: T) => ReactNode }) {
  return children(useLiveValue(store));
}
