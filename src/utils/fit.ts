// Réduction d'une illustration quand la place manque (petits écrans).
// Fonctions pures, sans React : testables avec Node.

// Hauteur de l'illustration : sa hauteur voulue, moins le dépassement du
// contenu, sans descendre sous le minimum
export function fitHeight(full: number, min: number, excess: number): number {
  const floor = Math.min(min, full);
  return Math.round(Math.max(floor, Math.min(full, full - Math.max(0, excess))));
}

// Nouveau dépassement après une mesure : contenu mesuré (avec l'illustration
// déjà réduite de `excess`) moins la place disponible. Écart de moins de
// 1 px ignoré : pas de boucle de mise en page pour un arrondi.
export function nextExcess(excess: number, content: number, available: number): number {
  const diff = content - available;
  if (Math.abs(diff) < 1) return excess;
  return Math.max(0, Math.round(excess + diff));
}

// Sans mesure (écran qui défile) : proportionnelle à la hauteur de l'écran
// sous 800 px (iPhone SE : 667), bornée par le minimum
export const REFERENCE_SCREEN_HEIGHT = 800;

export function windowFitHeight(full: number, min: number, windowHeight: number): number {
  if (!(windowHeight > 0) || windowHeight >= REFERENCE_SCREEN_HEIGHT) return full;
  return fitHeight(full, min, full - (full * windowHeight) / REFERENCE_SCREEN_HEIGHT);
}
