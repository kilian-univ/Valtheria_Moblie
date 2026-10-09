// Leçons terminées d'un module au moment où l'on lance une leçon depuis sa
// page. Au retour, la page compare avec l'état rechargé pour jouer le
// déverrouillage (utils/modulePath : unlockTransition). En mémoire seulement.
const snapshots = new Map<number, number[]>();

export function rememberLaunch(moduleId: number, completedIds: number[]): void {
  snapshots.set(moduleId, completedIds);
}

export function peekLaunch(moduleId: number): number[] | null {
  return snapshots.get(moduleId) ?? null;
}

export function forgetLaunch(moduleId: number): void {
  snapshots.delete(moduleId);
}
