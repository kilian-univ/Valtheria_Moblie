import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

// Lecteur d'écran actif (VoiceOver, TalkBack) ? Faux tant que la réponse
// n'est pas connue. Sert à ne pas faire avancer un écran tout seul pendant
// qu'il est lu (vrai ou faux, audit I13).
export function useScreenReader(): boolean {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isScreenReaderEnabled()
      .then((on) => {
        if (active) setEnabled(on);
      })
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('screenReaderChanged', (on) => setEnabled(on));
    return () => {
      active = false;
      sub.remove();
    };
  }, []);

  return enabled;
}
