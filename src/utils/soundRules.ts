// Règles des sons de l'app, sans React ni module natif : testables avec Node.
// La lecture elle-même est dans utils/sound.ts.

// Un fichier par son, dans assets/sounds (AAC .m4a, voir sound.ts)
export const SOUND_NAMES = [
  'select',
  'correct',
  'wrong',
  'swipe',
  'combo',
  'lesson-complete',
  'streak',
  'chest-step',
  'chest-open',
  'coins',
  'unlock',
] as const;

export type SoundName = (typeof SOUND_NAMES)[number];

// Événements de l'app et le son de chacun (joué en même temps que la
// vibration correspondante, voir utils/feedback.ts). Aucun son pour un cran
// de curseur : la vibration suffit.
export const EVENT_SOUNDS = {
  // Toucher une option, un bouton de réponse, un élément d'associer,
  // attraper une ligne de l'ordre
  pick: 'select',
  // Bonne / mauvaise réponse (feuille de réponse, paire, carte)
  right: 'correct',
  wrong: 'wrong',
  // Carte de vrai ou faux qui part
  swipe: 'swipe',
  // Pastille « d'affilée » qui apparaît ou monte d'un palier
  combo: 'combo',
  // Arrivée du bilan de fin de leçon
  lessonComplete: 'lesson-complete',
  // Série qui augmente
  streakUp: 'streak',
  // Palier de rareté du coffre, ouverture, Vals qui défilent
  chestStep: 'chest-step',
  chestOpen: 'chest-open',
  coins: 'coins',
  // Leçon déverrouillée, nouvelle médaille de série
  unlock: 'unlock',
} as const satisfies Record<string, SoundName>;

export type SoundEvent = keyof typeof EVENT_SOUNDS;

export function soundForEvent(event: SoundEvent): SoundName {
  return EVENT_SOUNDS[event];
}

// Coffre : chaque palier un peu plus aigu (deux demi-tons de plus à chaque
// fois), par la vitesse de lecture sans correction de hauteur : le son
// monte naturellement, comme un disque accéléré, sans être déformé.
const SEMITONES_PER_STEP = 2;
const RATE_MAX = 2;

export function chestStepRate(step: number): number {
  const s = Number.isFinite(step) ? Math.max(0, Math.floor(step)) : 0;
  return Math.min(RATE_MAX, Math.pow(2, (SEMITONES_PER_STEP * s) / 12));
}

// Pastille d'affilée : à son apparition (3) puis à chaque nouveau palier
export function comboReached(before: number, after: number, min: number): boolean {
  return after >= min && after > before;
}

// Réglage « Sons » mémorisé sur le téléphone : activé par défaut, coupé
// seulement par un « off » explicite
export const SOUND_SETTING_OFF = 'off';

export function parseSoundSetting(raw: string | null | undefined): boolean {
  return raw !== SOUND_SETTING_OFF;
}

// Un son part-il ? Réglage activé, et sur le web seulement après une
// première interaction (règle des navigateurs : rien n'est tenté avant)
export function soundAllowed(enabled: boolean, web: boolean, interacted: boolean): boolean {
  return enabled && (!web || interacted);
}
