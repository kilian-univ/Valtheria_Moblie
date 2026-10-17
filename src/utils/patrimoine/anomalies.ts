// Relevés anormaux des courbes (patrimoine, cours d'un actif) : un point qui
// s'écarte brusquement de ses voisins puis revient, le plus souvent un cours
// qui n'a pas pu être obtenu au moment du relevé. Masqués par défaut, jamais
// supprimés ici. Sans React : testable avec Node.

// Filtre de Hampel : fenêtre de 5 points (2 de chaque côté), un point est
// anormal s'il s'écarte de la médiane de la fenêtre de plus de 3 fois l'écart
// absolu médian…
const HALF_WINDOW = 2;
const MAD_FACTOR = 3;
// … et d'au moins 8 % de cette médiane : sur 5 points, l'écart médian est
// minuscule quand la courbe est calme, et la moindre variation normale
// dépasserait seule le seuil (vérifié sur une vraie courbe : 28 points normaux
// sur 565 sans ce plancher, les 2 vrais relevés faux avec)
const MIN_RELATIVE_GAP = 0.08;
// Règle simple : une chute ou une hausse de plus de 30 % qui revient aussitôt
// (le point suivant retrouve, à 10 % près, le précédent)
const JUMP = 0.3;
const BACK = 0.1;

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

const gap = (a: number, b: number) => (b === 0 ? (a === 0 ? 0 : Infinity) : Math.abs(a / b - 1));

// Indices des points anormaux (le premier et le dernier ne sont jamais jugés :
// il leur manque un voisin)
export function anomalyIndexes(values: readonly number[]): number[] {
  const out = new Set<number>();
  const n = values.length;
  for (let i = HALF_WINDOW; i < n - HALF_WINDOW; i++) {
    const window = values.slice(i - HALF_WINDOW, i + HALF_WINDOW + 1);
    const m = median(window);
    const mad = median(window.map((v) => Math.abs(v - m)));
    const d = Math.abs(values[i] - m);
    if (d > MAD_FACTOR * mad && d >= MIN_RELATIVE_GAP * Math.abs(m)) out.add(i);
  }
  for (let i = 1; i < n - 1; i++) {
    const prev = values[i - 1];
    if (gap(values[i], prev) > JUMP && gap(values[i + 1], prev) <= BACK) out.add(i);
  }
  return [...out].sort((a, b) => a - b);
}

// Points gardés et points masqués (hide : l'option « Masquer les relevés
// anormaux », activée par défaut). La courbe relie les voisins des points masqués.
export function splitAnomalies<T>(items: readonly T[], valueOf: (item: T) => number, hide: boolean): { kept: T[]; hidden: T[] } {
  const bad = new Set(anomalyIndexes(items.map(valueOf)));
  if (bad.size === 0) return { kept: [...items], hidden: [] };
  const hidden = items.filter((_, i) => bad.has(i));
  return { kept: hide ? items.filter((_, i) => !bad.has(i)) : [...items], hidden };
}
