import { Module } from '@/src/context/ApiContext';
import type { Universe } from '@/src/lesson/model';
import { UNKNOWN_STREAK_FIELDS, type StreakFields } from '@/src/utils/streakServer';

// loaded : vrai dès que les modules ont été chargés une fois (distingue
// « pas encore chargé » de « liste vide »). Le lecteur de leçon écrit ici en
// partiel ({ modules, xp, streak }) : les autres champs sont conservés.
// universes : vide tant que le serveur n'a pas de route /universes.
// Gels, record et gel utilisé hier : du serveur (20/10/2026), inconnus avant.
type State = StreakFields & {
  modules: Module[];
  universes: Universe[];
  streak: number;
  xp: number;
  level: number;
  vals: number;
  loaded: boolean;
};

export const EMPTY_LEARNING: State = { modules: [], universes: [], streak: 0, xp: 0, level: 1, vals: 0, loaded: false, ...UNKNOWN_STREAK_FIELDS };

let state: State = EMPTY_LEARNING;
const listeners = new Set<() => void>();

export const learningStore = {
  getState: () => state,
  setState(patch: Partial<State>) {
    state = { ...state, ...patch };
    listeners.forEach((l) => l());
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
