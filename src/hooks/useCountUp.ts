import { useEffect, useState } from 'react';
import { useReducedMotion } from 'react-native-reanimated';

import { counterEasing, durations } from '@/src/constants/motion';

type CountUpOptions = {
  from?: number;
  delay?: number;
  duration?: number;
};

// Au plus une mise à jour toutes les 50 ms (≈ 20 par seconde) : l'œil ne
// distingue pas plus vite un chiffre qui défile, et chaque mise à jour est
// un rendu React
export const COUNT_STEP_MS = 50;

// Valeur qui défile de `from` à `to` (courbe des compteurs), après `delay`.
// Animations réduites : la valeur finale tout de suite.
export function useCountUp(
  to: number,
  { from = 0, delay = 0, duration = durations.counter }: CountUpOptions = {}
): number {
  const reduced = useReducedMotion();
  const [value, setValue] = useState(from);

  useEffect(() => {
    if (reduced) return;
    let frame = 0;
    let start: number | null = null;
    let last = -Infinity;
    const tick = (now: number) => {
      if (start === null) start = now;
      const progress = Math.min(1, (now - start) / duration);
      if (progress >= 1) {
        setValue(to);
        return;
      }
      if (now - last >= COUNT_STEP_MS) {
        last = now;
        setValue(from + (to - from) * counterEasing(progress));
      }
      frame = requestAnimationFrame(tick);
    };
    const timer = setTimeout(() => {
      // Rien à faire défiler : la valeur, en une image
      frame = requestAnimationFrame(from === to ? () => setValue(to) : tick);
    }, delay);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(frame);
    };
  }, [to, from, delay, duration, reduced]);

  return reduced ? to : value;
}
