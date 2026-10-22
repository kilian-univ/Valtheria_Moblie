import { ReactNode, useState, useSyncExternalStore } from 'react';

import { createLiveValue, type LiveValue } from '@/src/utils/frameBatch';

// Une valeur vivante propre au composant (créée une fois)
export function useLiveStore<T>(initial: T): LiveValue<T> {
  const [store] = useState(() => createLiveValue(initial));
  return store;
}

// Lecture à chaque changement : seul le composant abonné se re-rend
export function useLiveValue<T>(store: LiveValue<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}

// Composant isolé qui affiche une valeur vivante (grand chiffre du pari)
export function Live<T>({ store, children }: { store: LiveValue<T>; children: (value: T) => ReactNode }) {
  return children(useLiveValue(store));
}
