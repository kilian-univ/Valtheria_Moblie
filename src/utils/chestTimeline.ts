// Déroulé du coffre en trois temps, sans React : testable avec Node.
// 1. Anticipation : le coffre fermé tremble de plus en plus en montant en
//    rareté, puis la lumière filtre par les fentes du couvercle ;
// 2. Moment fort : il s'ouvre (rebond, flash bref, gerbe de pièces) ;
// 3. Retombée : les pièces retombent, la rareté s'inscrit, le montant
//    défile, puis le coffre reste posé dans une lumière douce.
// Tout tient en CHEST_MAX_MS ; un toucher passe directement à la fin.

export const CHEST_MAX_MS = 3000;
// Écart entre deux paliers de rareté
export const CHEST_STEP_MS = 350;
// Anticipation la plus courte (coffre déjà à sa rareté)
const ANTICIPATION_MIN = 700;
// La lumière filtre ce temps-là avant l'ouverture
const LEAK_BEFORE_OPEN = 450;
export const CHEST_FLASH_MS = 120;
export const CHEST_FOUNTAIN_MS = 1000;
const STAMP_AFTER_OPEN = 450;
const COUNT_AFTER_OPEN = 550;
export const CHEST_COUNT_MS = 700;

export type ChestTimeline = {
  // Instants (ms depuis l'arrivée) de chaque palier de rareté après le premier
  steps: number[];
  leak: number;
  open: number;
  stamp: number;
  count: number;
  // Fin du déroulé : le montant a fini de défiler
  end: number;
};

// stages : nombre de raretés montrées (1 pour le coffre surprise, jusqu'à 4)
export function chestTimeline(stages: number): ChestTimeline {
  const n = Math.max(1, Math.min(4, Math.floor(stages) || 1));
  const steps = Array.from({ length: n - 1 }, (_, i) => (i + 1) * CHEST_STEP_MS);
  const open = Math.max(ANTICIPATION_MIN, (n - 1) * CHEST_STEP_MS + CHEST_STEP_MS);
  const count = open + COUNT_AFTER_OPEN;
  return { steps, leak: open - LEAK_BEFORE_OPEN, open, stamp: open + STAMP_AFTER_OPEN, count, end: count + CHEST_COUNT_MS };
}

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
