// Écran de bienvenue : pastilles de confiance. Fonctions pures, sans React :
// testables avec Node.

import type { Universe } from '../lesson/model';
import { roundedCount } from './format';

export type TrustPill = { key: 'univers' | 'mots'; icon: 'compass-outline' | 'book-outline'; label: string };

// Univers réellement ouverts : ceux qui ont au moins un module publié
// (GET /universes, public depuis le 20/10/2026). Liste indisponible : null.
// Jamais un nombre écrit en dur (audit B2).
export function openUniversesCount(universes: readonly Pick<Universe, 'moduleIds'>[] | null | undefined): number | null {
  if (!universes) return null;
  return universes.filter((u) => u.moduleIds.length > 0).length;
}

// « 1 univers ouvert, d'autres arrivent » tant qu'un seul est ouvert, puis
// « 5 univers » dès qu'il y en a plusieurs
export function universesLabel(open: number): string {
  return open === 1 ? '1 univers ouvert, d’autres arrivent' : `${open} univers`;
}

// « 1 univers ouvert, d'autres arrivent » (nombre réel d'univers ouverts) et
// « 200+ mots expliqués » (nombre réel du dictionnaire, arrondi). Nombre
// indisponible, nul ou trop petit : la pastille disparaît.
export function trustPills(words: number | null | undefined, openUniverses: number | null | undefined = null): TrustPill[] {
  const pills: TrustPill[] = [];
  if (openUniverses) pills.push({ key: 'univers', icon: 'compass-outline', label: universesLabel(openUniverses) });
  const count = roundedCount(words);
  if (count) pills.push({ key: 'mots', icon: 'book-outline', label: `${count} mots expliqués` });
  return pills;
}
