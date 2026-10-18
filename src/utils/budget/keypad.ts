// Pavé numérique du budget (solde, montants) : ce qui est tapé, en texte,
// puis sa valeur. Deux décimales au plus, virgule française. Le solde peut
// être négatif (découvert). Fonctions pures, testables avec Node.

import { NNBSP } from '@/src/utils/frenchSpaces';

export type PadKey = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | ',' | 'del' | '-';

const MAX_DIGITS = 8;

export function pressKey(text: string, key: PadKey): string {
  if (key === 'del') return text.slice(0, -1);
  if (key === '-') return text.startsWith('-') ? text.slice(1) : `-${text}`;
  const [int, dec] = text.replace('-', '').split(',');
  if (key === ',') return text.includes(',') ? text : `${text === '' || text === '-' ? `${text}0` : text},`;
  if (dec !== undefined) return dec.length >= 2 ? text : text + key;
  if (int.replace(/^0+/, '').length >= MAX_DIGITS) return text;
  // « 0 » puis « 5 » : « 5 », pas « 05 »
  if (int === '0') return `${text.slice(0, -1)}${key}`;
  return text + key;
}

export function padValue(text: string): number | null {
  const clean = text.replace(',', '.');
  if (clean === '' || clean === '-' || clean === '.' || clean === '-.') return null;
  const n = Number(clean);
  return Number.isFinite(n) ? n : null;
}

// Texte d'un montant pour reprendre la saisie : 1287 → « 1287 », 23.5 → « 23,5 »
export function padText(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '';
  return String(Math.round(value * 100) / 100).replace('.', ',');
}

// Affichage de ce qui est tapé : « 1 287 € », « 23,5 € », « − 40 € »
export function padDisplay(text: string): string {
  if (text === '' || text === '-') return `${text === '-' ? '− ' : ''}0${NNBSP}€`;
  const negative = text.startsWith('-');
  const [int, dec] = text.replace('-', '').split(',');
  const grouped = (int || '0').replace(/\B(?=(\d{3})+(?!\d))/g, NNBSP);
  return `${negative ? `−${NNBSP}` : ''}${grouped}${dec !== undefined ? `,${dec}` : ''}${NNBSP}€`;
}
