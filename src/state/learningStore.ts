import { Module } from '@/src/context/ApiContext';

type State = { modules: Module[]; streak: number; xp: number };

let state: State = { modules: [], streak: 0, xp: 0 };
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