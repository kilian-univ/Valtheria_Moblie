// Règles des sons de l'app, sans React ni module natif : testables avec Node.
// La lecture elle-même est dans utils/sound.ts.

// Un fichier par son, dans assets/sounds (AAC .m4a, voir sound.ts)
export const SOUND_NAMES = [
  'tick',
  'select',
  'pickup',
  'drop',
  'correct',
  'wrong',
  'match',
  'mismatch',
  'advance',
  'swipe',
  'reveal',
  'unlock',
  'message-in',
  'message-out',
  'chest-step',
  'coins',
  'lesson-complete',
  'module-complete',
  'streak',
  'chest-open',
  'combo',
  'freeze',
] as const;

export type SoundName = (typeof SOUND_NAMES)[number];

// Sons prévus mais pas encore livrés : on les appelle déjà par leur nom ;
// tant que le fichier manque, un remplaçant joue à sa place. Le jour où le
// fichier arrive, il suffit de l'ajouter à SOUND_NAMES et à sound.ts.
export const FUTURE_SOUNDS = ['medal', 'notification'] as const;
export type FutureSoundName = (typeof FUTURE_SOUNDS)[number];
export type AnySoundName = SoundName | FutureSoundName;

// Remplaçants : chaque son et son départ (ms après le premier)
export type SoundStep = { name: SoundName; at: number };
const FALLBACKS: Record<FutureSoundName, SoundStep[]> = {
  // Nouvelle médaille : déverrouillage puis combo
  medal: [
    { name: 'unlock', at: 0 },
    { name: 'combo', at: 300 },
  ],
  // Rappel quotidien : son système du téléphone (voir reminderSound)
  notification: [],
};

export function isSoundName(name: string): name is SoundName {
  return (SOUND_NAMES as readonly string[]).includes(name);
}

// Ce qui joue vraiment pour un nom : le fichier s'il existe, sinon son remplaçant
export function soundSteps(name: AnySoundName): SoundStep[] {
  if (isSoundName(name)) return [{ name, at: 0 }];
  return FALLBACKS[name];
}

// Rappel quotidien : son système par défaut tant que le fichier
// « notification » n'est pas livré. Le jour venu : déposer
// assets/sounds/notification.wav, le déclarer dans app.json (plugin
// expo-notifications, option sounds) et l'écrire ici. Seule une version
// installée de l'app le joue : Expo Go garde le son système.
export const REMINDER_SOUND_FILE: string | null = null;

export function reminderSound(file: string | null = REMINDER_SOUND_FILE): string {
  return file ?? 'default';
}

// Hiérarchie des volumes, en un seul tableau : micro-sons nettement plus
// bas, sons moyens au niveau normal, grands sons un peu plus présents.
// Tous les fichiers sont au même niveau (−18 dBFS) : c'est ici qu'on règle.
export const SOUND_LEVELS = {
  micro: 0.3,
  medium: 0.7,
  big: 0.9,
} as const;

export const SOUND_LEVEL: Record<SoundName, keyof typeof SOUND_LEVELS> = {
  tick: 'micro',
  select: 'micro',
  pickup: 'micro',
  drop: 'micro',
  correct: 'medium',
  wrong: 'medium',
  match: 'medium',
  mismatch: 'medium',
  advance: 'medium',
  swipe: 'medium',
  reveal: 'medium',
  unlock: 'medium',
  'message-in': 'medium',
  'message-out': 'medium',
  'chest-step': 'medium',
  coins: 'medium',
  'lesson-complete': 'big',
  'module-complete': 'big',
  streak: 'big',
  'chest-open': 'big',
  combo: 'big',
  freeze: 'big',
};

// Volume de lecture : niveau du son, éventuellement adouci (gain < 1)
export function soundVolume(name: SoundName, gain = 1): number {
  const g = Number.isFinite(gain) ? gain : 1;
  return Math.min(1, Math.max(0, SOUND_LEVELS[SOUND_LEVEL[name]] * g));
}

// Lecteurs prêts par son : plusieurs pour ceux qui se chevauchent (crans
// rapides, réponses enchaînées, messages, paliers du coffre), un sinon
const VOICES: Partial<Record<SoundName, number>> = {
  tick: 4,
  select: 3,
  correct: 2,
  wrong: 2,
  match: 2,
  mismatch: 2,
  swipe: 2,
  pickup: 2,
  drop: 2,
  'message-in': 2,
  'chest-step': 2,
};

export function soundVoices(name: SoundName): number {
  return VOICES[name] ?? 1;
}

// Événements de l'app et le son de chacun (joué en même temps que la
// vibration correspondante, voir utils/feedback.ts)
export const EVENT_SOUNDS = {
  // Cran d'un curseur (pari, simulateur, répartir), butée, chiffres du bilan
  tick: 'tick',
  // Toucher une option, un bouton de réponse, un élément d'associer, une
  // réplique ; ajouter un mot à « Mes mots »
  pick: 'select',
  // Tri : ligne attrapée, ligne posée
  pickup: 'pickup',
  drop: 'drop',
  // Feuille de réponse : bonne / mauvaise réponse ; vrai ou faux tranché
  right: 'correct',
  wrong: 'wrong',
  // Associer : paire trouvée, mauvaise paire ; leçon verrouillée (très doux)
  match: 'match',
  mismatch: 'mismatch',
  // Écran suivant sans verdict (Je parie, Continuer, simulateur, intro)
  advance: 'advance',
  // Carte de vrai ou faux qui part, ou qui arrive (très doux)
  swipe: 'swipe',
  // Chiffre de la révélation qui se pose
  reveal: 'reveal',
  // Message de Léo ou Sam qui arrive, réponse envoyée
  messageIn: 'message-in',
  messageOut: 'message-out',
  // Pastille « d'affilée » qui apparaît ou monte d'un palier
  combo: 'combo',
  // Fin de leçon, fin de module
  lessonComplete: 'lesson-complete',
  moduleComplete: 'module-complete',
  // Série qui augmente ; gel de série qui la sauve
  streakUp: 'streak',
  freeze: 'freeze',
  // Palier de rareté du coffre, ouverture, Vals qui défilent
  chestStep: 'chest-step',
  chestOpen: 'chest-open',
  coins: 'coins',
  // Leçon déverrouillée
  unlock: 'unlock',
  // Nouvelle médaille (remplaçant : unlock puis combo)
  medal: 'medal',
} as const satisfies Record<string, AnySoundName>;

export type SoundEvent = keyof typeof EVENT_SOUNDS;

export function soundForEvent(event: SoundEvent): AnySoundName {
  return EVENT_SOUNDS[event];
}

// Cran de curseur : un son toutes les 60 ms au plus (un glissement rapide
// ne crépite pas), un peu plus aigu vers la droite
export const TICK_MIN_GAP = 60;
// Chiffres du bilan qui défilent : plus espacés encore
export const COUNT_TICK_MIN_GAP = 90;

// Hauteur du cran selon la position (0 à gauche, 1 à droite) : de −1 à +2
// demi-tons, à peine perceptible
const TICK_LOW = -1;
const TICK_HIGH = 2;
export function tickRate(ratio: number): number {
  const r = Number.isFinite(ratio) ? Math.min(1, Math.max(0, ratio)) : 0;
  return Math.pow(2, (TICK_LOW + r * (TICK_HIGH - TICK_LOW)) / 12);
}

// Curseur qui bute : cran plus grave ; chiffres du bilan : cran plus aigu
export const TICK_BLOCKED_RATE = Math.pow(2, -7 / 12);
export const TICK_COUNT_RATE = Math.pow(2, 5 / 12);
// Sons adoucis (45 % de leur niveau) : carte qui arrive, leçon verrouillée,
// feuille finale du vrai ou faux et d'associer, allumage de la flamme,
// ouverture d'une leçon
export const SOFT_GAIN = 0.45;

// Durée des fichiers (ms) dont un autre son doit attendre la fin : ticks du
// bilan après lesson-complete, gel après la médaille (remplaçant compris :
// unlock, puis combo à 300 ms qui dure 700 ms), gel après l'allumage
export const SOUND_LENGTH = {
  'lesson-complete': 1000,
  medal: 1000,
  streak: 750,
} as const;

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
