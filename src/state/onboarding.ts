import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

import { INITIAL_ONBOARDING, OnboardingState, parseOnboarding } from '@/src/utils/onboarding';

// Avancement de la première ouverture, mémorisé sur le téléphone : si la
// personne quitte en cours de route, elle reprend où elle en était.

const KEY = 'valtheria:premiere-ouverture';

type Store = { state: OnboardingState; loaded: boolean };
let store: Store = { state: INITIAL_ONBOARDING, loaded: false };
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export const onboardingStore = {
  get: () => store,
  async load(): Promise<OnboardingState> {
    if (store.loaded) return store.state;
    try {
      const raw = await AsyncStorage.getItem(KEY);
      store = { state: parseOnboarding(raw ? JSON.parse(raw) : null), loaded: true };
    } catch {
      store = { state: INITIAL_ONBOARDING, loaded: true };
    }
    emit();
    return store.state;
  },
  update(patch: Partial<OnboardingState>) {
    store = { state: { ...store.state, ...patch }, loaded: true };
    emit();
    AsyncStorage.setItem(KEY, JSON.stringify(store.state)).catch(() => {
      // stockage indisponible : la reprise ne marchera pas, sans autre conséquence
    });
  },
  // Développement : efface toute la mémoire du parcours (« Rejouer la
  // première ouverture »)
  reset() {
    store = { state: INITIAL_ONBOARDING, loaded: true };
    emit();
    AsyncStorage.removeItem(KEY).catch(() => {});
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

export function useOnboarding(): Store & { update: (patch: Partial<OnboardingState>) => void } {
  const s = useSyncExternalStore(onboardingStore.subscribe, onboardingStore.get);
  return { ...s, update: onboardingStore.update };
}
