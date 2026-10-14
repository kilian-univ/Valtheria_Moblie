import { ReactNode, useEffect, useState, useSyncExternalStore } from 'react';

import { createFrameBatch, createLiveValue, type LiveValue } from '@/src/utils/frameBatch';

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

// Composant isolé qui affiche une valeur vivante (grand chiffre du pari)
export function Live<T>({ store, children }: { store: LiveValue<T>; children: (value: T) => ReactNode }) {
  return children(useLiveValue(store));
}
