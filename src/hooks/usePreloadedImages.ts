import { useEffect, useEffectEvent, useState } from 'react';
import { type ImageSourcePropType, Platform } from 'react-native';

import { preloadAll } from '@/src/utils/preload';
import { runSafely } from '@/src/utils/safe';

// Sur iOS et Android, les images sont dans l'app : rien à précharger (en
// développement, le préchargement retardait l'ouverture ; audit C27). Sur le
// web, elles viennent du réseau.
const PRELOAD = Platform.OS === 'web';

// Images à charger avant le premier écran (bienvenue : logo et Val), pour
// qu'elles n'apparaissent pas en clignotant sur le web, par expo-asset
// (Asset.fromModule). Jamais bloquant : au bout de `maxWait`, ou en cas
// d'échec, l'app s'ouvre sans préchargement.
export function usePreloadedImages(sources: ImageSourcePropType[], maxWait = 800): boolean {
  const [ready, setReady] = useState(!PRELOAD);

  // Une seule fois, au démarrage (useEffectEvent : les sources du moment,
  // sans relancer l'effet)
  const start = useEffectEvent((): (() => void) => {
    if (!PRELOAD) return () => {};
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
  });
  useEffect(() => start(), []);

  return ready;
}

// expo-asset chargé au premier besoin : s'il manque ou échoue, l'image n'est
// simplement pas préchargée
function loadImage(source: ImageSourcePropType): Promise<unknown> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Asset } = require('expo-asset') as typeof import('expo-asset');
  return Asset.fromModule(source as number).downloadAsync();
}
