// Écran de bienvenue : pastilles de confiance. Fonctions pures, sans React :
// testables avec Node.

import { roundedCount } from './format';

// Le nombre d'univers n'est pas public (GET /themes exige un compte)
export const UNIVERSES_COUNT = 15;

export type TrustPill = { key: 'univers' | 'mots'; icon: 'compass-outline' | 'book-outline'; label: string };

// « 15 univers » et « 200+ mots expliqués » (nombre réel du dictionnaire,
// arrondi). Nombre indisponible ou trop petit : pas de pastille des mots.
export function trustPills(words: number | null | undefined): TrustPill[] {
  const pills: TrustPill[] = [{ key: 'univers', icon: 'compass-outline', label: `${UNIVERSES_COUNT} univers` }];
  const count = roundedCount(words);
  if (count) pills.push({ key: 'mots', icon: 'book-outline', label: `${count} mots expliqués` });
  return pills;
}
