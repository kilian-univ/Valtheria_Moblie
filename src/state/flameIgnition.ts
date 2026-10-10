import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

import { localDay } from '@/src/utils/day';
import { shouldIgnite } from '@/src/utils/discoveryHome';

// Allumage de la flamme de série : à sa première apparition de la journée sur
// l'accueil, jamais plus d'une fois par jour. Jour mémorisé sur le téléphone.

const KEY = 'valtheria:flamme-allumee';

// Réponse de la journée, gardée pour toute la session : revenir sur l'accueil
// ne rallume pas la flamme
let decided: { day: string; ignite: boolean } | null = null;

async function decide(): Promise<boolean> {
  const today = localDay(new Date());
  if (decided?.day === today) return decided.ignite;
  let last: string | null = null;
  try {
    last = await AsyncStorage.getItem(KEY);
  } catch {
    // stockage indisponible : on allume, sans conséquence
  }
  const ignite = shouldIgnite(last);
  decided = { day: today, ignite };
  if (ignite) AsyncStorage.setItem(KEY, today).catch(() => {});
  return ignite;
}

// null tant que la réponse n'est pas connue, puis true (allumage) ou false
export function useDailyIgnite(): boolean | null {
  const [ignite, setIgnite] = useState<boolean | null>(() => (decided?.day === localDay(new Date()) ? false : null));
  useEffect(() => {
    if (ignite !== null) return;
    let active = true;
    decide().then((value) => {
      if (active) setIgnite(value);
    });
    return () => {
      active = false;
    };
  }, [ignite]);
  return ignite;
}

// Développement (« Tout réinitialiser ») : la flamme se rallumera
export async function resetFlameIgnition(): Promise<void> {
  decided = null;
  await AsyncStorage.removeItem(KEY).catch(() => {});
}
