import { useSyncExternalStore } from 'react';

// Interrupteurs de diagnostic, en développement SEULEMENT (écran de
// connexion) : couper les vibrations, les sons, ou les mises à jour de
// l'écran pendant un glissement de curseur, pour isoler ce qui saccade.
// Dans une version publiée (__DEV__ faux), tout reste à false : rien n'est
// jamais coupé et aucun interrupteur n'est affiché.
export type DevFlags = {
  noHaptics: boolean;
  noSounds: boolean;
  noLiveUpdates: boolean;
};

const OFF: DevFlags = { noHaptics: false, noSounds: false, noLiveUpdates: false };
let flags: DevFlags = OFF;
const listeners = new Set<() => void>();

export const devFlags = {
  get: (): DevFlags => (__DEV__ ? flags : OFF),
  set(patch: Partial<DevFlags>) {
    if (!__DEV__) return;
    flags = { ...flags, ...patch };
    listeners.forEach((l) => l());
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

export function useDevFlags(): DevFlags {
  return useSyncExternalStore(devFlags.subscribe, devFlags.get, devFlags.get);
}
