import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'react-native-reanimated';

import { counterEasing } from '@/src/constants/motion';

import { COUNT_STEP_MS } from './useCountUp';

const DURATION = 350;

// Chiffre qui défile de sa valeur affichée vers la nouvelle cible, à chaque
// changement (résultat en direct du simulateur), au plus une mise à jour
// toutes les 50 ms. Animations réduites, ou `animate` à faux (glissement en
// cours : le chiffre suit le curseur) : la cible tout de suite.
export function useRollingNumber(to: number, animate = true): number {
  const reducedMotion = useReducedMotion();
  const reduced = reducedMotion || !animate;
  const [value, setValue] = useState(to);
  const shown = useRef(to);

  useEffect(() => {
    if (reduced) {
      // Le chiffre suit la cible ; l'état rattrape à l'image suivante, pour que
      // le défilement suivant parte de la bonne valeur
      shown.current = to;
      const frame = requestAnimationFrame(() => setValue(to));
      return () => cancelAnimationFrame(frame);
    }
    const from = shown.current;
    if (from === to) return;
    let frame = 0;
    let start: number | null = null;
    let last = -Infinity;
    const tick = (now: number) => {
      if (start === null) start = now;
      const progress = Math.min(1, (now - start) / DURATION);
      if (progress >= 1) {
        shown.current = to;
        setValue(to);
        return;
      }
      if (now - last >= COUNT_STEP_MS) {
        last = now;
        const next = from + (to - from) * counterEasing(progress);
        shown.current = next;
        setValue(next);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [to, reduced]);

  return reduced ? to : value;
}
