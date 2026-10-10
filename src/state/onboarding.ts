import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

import { MEDALS, simulatedLessonDays } from '@/src/utils/streakRewards';
import { INITIAL_ONBOARDING, needsLessonDayMigration, OnboardingState, parseOnboarding } from '@/src/utils/onboarding';

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
      const parsed: unknown = raw ? JSON.parse(raw) : null;
      store = { state: parseOnboarding(parsed), loaded: true };
      // Leçons jouées sans date : le jour qui leur est donné est gardé, pour
      // qu'il ne glisse pas d'une ouverture à l'autre
      if (needsLessonDayMigration(parsed)) AsyncStorage.setItem(KEY, JSON.stringify(store.state)).catch(() => {});
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
  // Développement, « Rejouer la première ouverture » : le parcours repart de
  // la bienvenue, la progression (prénom, leçons, série) est gardée
  replay() {
    onboardingStore.update({ status: 'en-cours', step: 'bienvenue' });
  },
  // Développement : série simulée de n jours finissant hier (avant-hier avec
  // missYesterday : hier est sauvé par un gel s'il y en a). Les paliers déjà
  // dépassés sont tenus pour fêtés : la prochaine leçon fête le suivant.
  simulateStreak(n: number, missYesterday = false) {
    const lessonDays = simulatedLessonDays(n, new Date(), missYesterday);
    onboardingStore.update({
      lessonDays,
      bestStreak: n,
      celebratedMedals: MEDALS.filter((m) => m.days <= n).map((m) => m.days),
      status: store.state.status === 'en-cours' ? 'plus-tard' : store.state.status,
    });
  },
  // Développement, « Tout réinitialiser » : efface toute la mémoire du
  // parcours (prénom, objectif, leçons, série, inscription fermée, célébration)
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
