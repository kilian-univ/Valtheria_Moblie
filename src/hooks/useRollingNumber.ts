import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'react-native-reanimated';

import { counterEasing } from '@/src/constants/motion';

const DURATION = 350;

// Chiffre qui défile de sa valeur affichée vers la nouvelle cible, à chaque
// changement (résultat en direct du simulateur). Animations réduites : la
// cible tout de suite.
export function useRollingNumber(to: number): number {
  const reduced = useReducedMotion();
  const [value, setValue] = useState(to);
  const shown = useRef(to);

  useEffect(() => {
    if (reduced) return;
    const from = shown.current;
    if (from === to) return;
    let frame = 0;
    let start: number | null = null;
    const tick = (now: number) => {
      if (start === null) start = now;
      const progress = Math.min(1, (now - start) / DURATION);
      const next = from + (to - from) * counterEasing(progress);
      shown.current = next;
      setValue(next);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [to, reduced]);

  return reduced ? to : value;
}
