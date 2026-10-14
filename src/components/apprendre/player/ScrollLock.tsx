import { createContext, useContext } from 'react';

// Verrou du défilement de l'écran du lecteur : un curseur, une carte
// balayée ou une ligne déplacée le pose pendant son geste, pour que la page
// ne défile pas en même temps.
export const ScrollLockContext = createContext<(locked: boolean) => void>(() => {});

export function useScrollLock(): (locked: boolean) => void {
  return useContext(ScrollLockContext);
}
