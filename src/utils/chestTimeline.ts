// Déroulé du coffre en trois temps, sans React : testable avec Node.
// 1. Anticipation (toute seule) : le coffre fermé tremble de plus en plus en
//    montant en rareté, puis la lumière filtre par les fentes du couvercle ;
//    ensuite il attend qu'on le touche (il respire, la lumière pulse).
// 2. Moment fort, au toucher : il s'ouvre (rebond, flash bref, gerbe de
//    pièces).
// 3. Retombée : les pièces retombent, la rareté s'inscrit, le montant
//    défile, puis le coffre reste posé dans une lumière douce.
// Moment fort et retombée tiennent en CHEST_OPEN_MAX_MS ; un toucher pendant
// la retombée passe directement à la fin.

export const CHEST_OPEN_MAX_MS = 1500;
// Écart entre deux paliers de rareté
export const CHEST_STEP_MS = 350;
// Anticipation la plus courte (coffre déjà à sa rareté)
const ANTICIPATION_MIN = 700;
// La lumière filtre ce temps-là avant que le coffre attende
const LEAK_BEFORE_READY = 450;
export const CHEST_FLASH_MS = 120;
export const CHEST_FOUNTAIN_MS = 1000;
export const CHEST_COUNT_MS = 700;

export type ChestAnticipation = {
  // Instants (ms depuis l'arrivée) de chaque palier de rareté après le premier
  steps: number[];
  // La lumière commence à filtrer
  leak: number;
  // Le coffre attend le toucher
  ready: number;
};

// stages : nombre de raretés montrées (1 pour le coffre surprise, jusqu'à 4)
export function chestAnticipation(stages: number): ChestAnticipation {
  const n = Math.max(1, Math.min(4, Math.floor(stages) || 1));
  const steps = Array.from({ length: n - 1 }, (_, i) => (i + 1) * CHEST_STEP_MS);
  const ready = Math.max(ANTICIPATION_MIN, n * CHEST_STEP_MS);
  return { steps, leak: ready - LEAK_BEFORE_READY, ready };
}

// Après le toucher (ms depuis l'ouverture) : la rareté s'inscrit, le
// montant défile, fin du déroulé
export const CHEST_AFTER_OPEN = {
  stamp: 450,
  count: 550,
  end: 550 + CHEST_COUNT_MS,
} as const;

// Tremblement qui grandit : amplitude (degrés) de chaque oscillation de
// l'anticipation, de min à max
export function growingShake(duration: number, period: number, min: number, max: number): number[] {
  const count = Math.max(1, Math.floor(duration / period));
  return Array.from({ length: count }, (_, i) => min + ((max - min) * i) / Math.max(1, count - 1));
}

// Trajectoire d'une pièce ou d'une étincelle de la gerbe, au temps t (s) :
// lancée en arc vers le haut, elle retombe sous la gravité (px, px/s, px/s²)
export function fountainPoint(vx: number, vy: number, gravity: number, t: number): { x: number; y: number } {
  return { x: vx * t, y: vy * t + 0.5 * gravity * t * t };
}
