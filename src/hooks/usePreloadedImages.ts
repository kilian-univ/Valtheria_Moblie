import { useEffect, useState } from 'react';
import { Image, ImageSourcePropType } from 'react-native';

// Images à charger avant le premier écran (bienvenue : logo et Val), pour
// qu'elles n'apparaissent pas en clignotant, surtout sur le web. Jamais
// bloquant : au bout de `maxWait`, ou en cas d'échec, on continue sans elles.
export function usePreloadedImages(sources: ImageSourcePropType[], maxWait = 800): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      setReady(true);
    };
    const uris = sources
      .map((s) => Image.resolveAssetSource(s)?.uri)
      .filter((uri): uri is string => typeof uri === 'string' && uri.length > 0);
    const cap = setTimeout(finish, maxWait);
    Promise.allSettled(uris.map((uri) => Image.prefetch(uri))).then(finish);
    return () => {
      done = true;
      clearTimeout(cap);
    };
    // Une seule fois, au démarrage
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return ready;
}
