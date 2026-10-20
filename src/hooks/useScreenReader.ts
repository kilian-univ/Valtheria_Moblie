import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

// Lecteur d'écran actif (VoiceOver, TalkBack) ? Faux tant que la réponse
// n'est pas connue. Sert à ne pas faire avancer un écran tout seul pendant
// qu'il est lu (vrai ou faux, audit I13). Sur le web, react-native-web répond
// toujours « oui » sans pouvoir le savoir, et n'a pas d'événement : on garde
// le comportement ordinaire.
export function useScreenReader(): boolean {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    let active = true;
    AccessibilityInfo.isScreenReaderEnabled()
      .then((on) => {
        if (active) setEnabled(on);
      })
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('screenReaderChanged', (on) => setEnabled(on));
    return () => {
      active = false;
      sub?.remove?.();
    };
  }, []);

  return enabled;
}
