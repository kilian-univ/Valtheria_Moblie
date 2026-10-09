import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useApi } from '@/src/context/ApiContext';
import LaunchScreen from './LaunchScreen';

// Démarrage le plus court possible :
// - le splash natif (logo) reste jusqu'à ce que l'app soit prête, puis se
//   masque en fondu de 200 ms ; l'accueil est déjà affiché dessous, avec son
//   squelette ;
// - seulement si l'app n'est toujours pas prête au bout d'1 s (session lente),
//   l'écran animé (reflet + barre) se pose par-dessus le logo natif, au même
//   endroit, puis s'efface quand l'app est prête.
const NATIVE_FADE = 200;
const SLOW_AFTER = 1000;
// Au-delà, on laisse place à l'app quoi qu'il arrive
const MAX_WAIT = 3000;

SplashScreen.preventAutoHideAsync().catch(() => {});
// Fondu du splash natif (sans effet dans Expo Go, qui affiche un avertissement)
if (Constants.executionEnvironment !== ExecutionEnvironment.StoreClient) {
  SplashScreen.setOptions({ duration: NATIVE_FADE, fade: true });
}

function hideNativeSplash() {
  SplashScreen.hideAsync().catch(() => {});
}

// Prêt = polices chargées + session lue sur le téléphone. ApiContext pose le
// token dès sa lecture locale (isAuthenticated), puis vérifie le profil en
// réseau ; sans token, il n'y a aucun appel réseau (!isLoading).
export default function StartupGate({ fontsReady }: { fontsReady: boolean }) {
  const { isAuthenticated, isLoading } = useApi();
  const [timedOut, setTimedOut] = useState(false);
  const ready = fontsReady && (isAuthenticated || !isLoading || timedOut);

  const [phase, setPhase] = useState<'native' | 'animated' | 'done'>('native');
  const readyRef = useRef(ready);
  useEffect(() => {
    readyRef.current = ready;
  }, [ready]);

  // Session lente : l'écran animé prend le relais du logo natif
  useEffect(() => {
    const slow = setTimeout(() => {
      if (!readyRef.current) setPhase((p) => (p === 'native' ? 'animated' : p));
    }, SLOW_AFTER);
    const cap = setTimeout(() => setTimedOut(true), MAX_WAIT);
    return () => {
      clearTimeout(slow);
      clearTimeout(cap);
    };
  }, []);

  // Cas normal : prêt avant 1 s → on masque le logo natif. On attend une
  // image pour que l'accueil (et son squelette) soit déjà peint dessous.
  useEffect(() => {
    if (!ready || phase !== 'native') return;
    const frame = requestAnimationFrame(() => {
      hideNativeSplash();
      setPhase('done');
    });
    return () => cancelAnimationFrame(frame);
  }, [ready, phase]);

  const finish = useCallback(() => setPhase('done'), []);

  if (phase !== 'animated') return null;
  return <LaunchScreen ready={ready} onShown={hideNativeSplash} onFinish={finish} />;
}
