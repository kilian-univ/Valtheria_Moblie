import * as Haptics from 'expo-haptics';

// Vibrations de l'app. Une seule par action de l'utilisateur, toujours en plus
// d'un retour visuel (beaucoup d'appareils ont la vibration coupée).
// Chaque appel échoue en silence : une vibration ratée ne doit rien casser.

// En développement, un échec est signalé une fois dans la console (sinon il
// passerait inaperçu : les fonctions d'expo-haptics sont asynchrones, l'erreur
// arrive dans la promesse). En production, rien.
let warned = false;
function report(err: unknown): void {
  if (!__DEV__ || warned) return;
  warned = true;
  console.warn('Vibration impossible (expo-haptics) :', err instanceof Error ? err.message : err);
}

function safely(run: () => Promise<void>): void {
  try {
    run().catch(report);
  } catch (err) {
    // module natif absent (web, Expo Go ancien)
    report(err);
  }
}

// Appui sur une action principale
export function tap(): void {
  safely(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}

// Changement de sélection (onglet segmenté, option, cran de curseur)
export function select(): void {
  safely(() => Haptics.selectionAsync());
}

export function success(): void {
  safely(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}

export function error(): void {
  safely(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
}

export function warning(): void {
  safely(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
}

// Moment rare : leçon terminée, objectif atteint
export function celebrate(): void {
  safely(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy));
}
