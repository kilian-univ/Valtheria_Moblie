import { scheduleOnRN } from 'react-native-worklets';

// Erreur rattrapée dans un geste : signalée en développement, jamais fatale
function report(message: string): void {
  if (__DEV__) console.warn('Geste interrompu (erreur rattrapée) :', message);
}

// Enveloppe un rappel de geste (onStart, onUpdate, onEnd…) : une erreur y
// est rattrapée sur le fil d'interface au lieu de faire planter l'app ;
// recover remet l'élément en place. fn et recover doivent être des
// worklets (directive 'worklet' en tête).
export function safeGesture<A extends unknown[]>(fn: (...args: A) => void, recover?: () => void) {
  return (...args: A) => {
    'worklet';
    try {
      fn(...args);
    } catch (e) {
      try {
        if (recover) recover();
      } catch {
        // rien de plus à faire : on garde l'app en vie
      }
      scheduleOnRN(report, String(e));
    }
  };
}
