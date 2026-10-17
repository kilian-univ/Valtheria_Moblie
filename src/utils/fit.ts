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

// ---------------------------------------------------------------------------
// Grand chiffre sur une seule ligne (pari, révélation, simulateur, coffre) :
// taille de police réduite tant qu'il ne tient pas dans la largeur
// ---------------------------------------------------------------------------

// Largeur approximative de chaque signe, en fraction de la taille de police
// (Fraunces, chiffres tabulaires), un peu large pour ne jamais déborder
const NARROW = /[\s.,:;'’]/;
const WIDE = /[%€$]/;
const DIGIT_WIDTH = 0.62;
const NARROW_WIDTH = 0.3;
const WIDE_WIDTH = 0.82;
const LETTER_WIDTH = 0.6;

export function textWidthEm(text: string): number {
  let em = 0;
  for (const char of text) {
    if (/[0-9]/.test(char)) em += DIGIT_WIDTH;
    else if (NARROW.test(char)) em += NARROW_WIDTH;
    else if (WIDE.test(char)) em += WIDE_WIDTH;
    else em += LETTER_WIDTH;
  }
  return em;
}

// Le plus large de plusieurs textes (à taille égale) : un grand chiffre qui
// varie en direct prend sa taille sur la valeur la plus longue possible,
// une fois pour toutes, et ne rapetisse pas pendant qu'on glisse
export function widestText(texts: string[]): string {
  return texts.reduce((a, b) => (textWidthEm(b) > textWidthEm(a) ? b : a), '');
}

// Taille qui fait tenir le texte dans `width` px : `max` si possible, jamais
// sous `min`. Sans largeur connue (premier rendu) : `max`.
export function fitFontSize(text: string, max: number, min: number, width: number): number {
  const em = textWidthEm(text);
  if (!(width > 0) || em <= 0) return max;
  const fitted = Math.floor(width / em);
  return Math.max(Math.min(min, max), Math.min(max, fitted));
}
