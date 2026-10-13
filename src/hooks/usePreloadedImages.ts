import { useEffect, useState } from 'react';
import type { ImageSourcePropType } from 'react-native';

import { preloadAll } from '@/src/utils/preload';
import { runSafely } from '@/src/utils/safe';

// Images à charger avant le premier écran (bienvenue : logo et Val), pour
// qu'elles n'apparaissent pas en clignotant, surtout sur le web. Méthode
// commune à iOS, Android et web : expo-asset (Asset.fromModule). Jamais
// bloquant : au bout de `maxWait`, ou en cas d'échec, l'app s'ouvre sans
// préchargement.
export function usePreloadedImages(sources: ImageSourcePropType[], maxWait = 800): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    const finish = () => {
      if (active) setReady(true);
    };
    // Filet de sécurité : quoi qu'il arrive, on continue après maxWait
    const cap = setTimeout(finish, maxWait + 100);
    runSafely('préchargement des images', () => preloadAll(sources, loadImage, maxWait).finally(finish));
    return () => {
      active = false;
      clearTimeout(cap);
    };
    // Une seule fois, au démarrage
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return ready;
}

// expo-asset chargé au premier besoin : s'il manque ou échoue, l'image n'est
// simplement pas préchargée
function loadImage(source: ImageSourcePropType): Promise<unknown> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Asset } = require('expo-asset') as typeof import('expo-asset');
  return Asset.fromModule(source as number).downloadAsync();
}
