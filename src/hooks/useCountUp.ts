import { useEffect, useState } from 'react';
import { useReducedMotion } from 'react-native-reanimated';

import { counterEasing, durations } from '@/src/constants/motion';

type CountUpOptions = {
  from?: number;
  delay?: number;
  duration?: number;
};

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
    const tick = (now: number) => {
      if (start === null) start = now;
      const progress = Math.min(1, (now - start) / duration);
      setValue(from + (to - from) * counterEasing(progress));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    const timer = setTimeout(() => {
      frame = requestAnimationFrame(tick);
    }, delay);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(frame);
    };
  }, [to, from, delay, duration, reduced]);

  return reduced ? to : value;
}
