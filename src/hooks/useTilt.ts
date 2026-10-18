import { Accelerometer } from 'expo-sensors';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

// Téléphone tourné en paysage : l'app reste en portrait (app.json), donc on
// lit la gravité. 'left' : le haut du téléphone vers la gauche ; 'right' :
// vers la droite ; 'portrait' : debout. null tant que rien n'est su (web,
// capteur absent). Il faut garder la position un court instant pour changer.
export type Tilt = 'left' | 'right' | 'portrait';

const INTERVAL = 150;
const HOLD = 3; // mesures d'affilée (environ un demi-seconde)
const THRESHOLD = 0.75;

export function useTilt(enabled: boolean): Tilt | null {
  const [tilt, setTilt] = useState<Tilt | null>(null);
  useEffect(() => {
    if (!enabled || Platform.OS === 'web') return;
    let sub: { remove: () => void } | null = null;
    let cancelled = false;
    let candidate: Tilt | null = null;
    let count = 0;
    Accelerometer.isAvailableAsync()
      .then((ok) => {
        if (!ok || cancelled) return;
        Accelerometer.setUpdateInterval(INTERVAL);
        sub = Accelerometer.addListener(({ x, y }) => {
          // Même sens que sur iPhone : Android donne l'opposé de la gravité
          const gx = Platform.OS === 'android' ? -x : x;
          const gy = Platform.OS === 'android' ? -y : y;
          const next: Tilt | null = gx < -THRESHOLD ? 'left' : gx > THRESHOLD ? 'right' : gy < -THRESHOLD ? 'portrait' : null;
          if (next === null || next !== candidate) {
            candidate = next;
            count = 0;
            return;
          }
          count += 1;
          if (count === HOLD) setTilt(next);
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, [enabled]);
  return enabled ? tilt : null;
}
