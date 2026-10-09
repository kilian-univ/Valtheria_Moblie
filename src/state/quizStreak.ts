import { useSyncExternalStore } from 'react';

// Série de bonnes réponses d'affilée à « Teste-toi », pour la session (non
// enregistrée sur le téléphone) : une mauvaise réponse la remet à zéro.
let streak = 0;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export const quizStreak = {
  get: () => streak,
  // Bonne réponse : +1 ; mauvaise : 0
  record(correct: boolean) {
    streak = correct ? streak + 1 : 0;
    emit();
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

export function useQuizStreak(): number {
  return useSyncExternalStore(quizStreak.subscribe, quizStreak.get);
}
