// Sons de l'app : point d'accroche unique, appelé aux mêmes moments que les
// vibrations (utils/haptics.ts). Les fichiers viendront plus tard : pour
// l'instant, rien ne se joue.

export type SoundName = 'tap' | 'select' | 'success' | 'error' | 'warning' | 'celebrate';

export function playSound(_name: SoundName): void {
  // À brancher sur les fichiers sons (expo-audio) quand ils seront prêts
}
