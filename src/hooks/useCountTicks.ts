import { useEffect } from 'react';

import { feedback } from '@/src/utils/feedback';

// Chiffre qui défile (série, bilan) : un cran aigu à chaque nouvelle valeur,
// espacé (feedback.countTick) ; rien tant qu'il est à sa valeur de départ
export function useCountTicks(value: number, from: number, enabled = true): void {
  useEffect(() => {
    if (enabled && value !== from) feedback.countTick();
  }, [value, from, enabled]);
}
