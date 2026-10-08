import { Module } from '@/src/context/ApiContext';

// loaded : vrai dès que les modules ont été chargés une fois (distingue
// « pas encore chargé » de « liste vide »). Le lecteur de leçon écrit ici en
// partiel ({ modules, xp, streak }) : les autres champs sont conservés.
type State = { modules: Module[]; streak: number; xp: number; level: number; vals: number; loaded: boolean };

let state: State = { modules: [], streak: 0, xp: 0, level: 1, vals: 0, loaded: false };
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
