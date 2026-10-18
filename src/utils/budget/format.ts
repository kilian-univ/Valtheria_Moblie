// Montants du budget : à l'euro quand ils sont ronds (« 70 € », « 31 € par
// jour »), avec deux décimales sinon (« 23,50 € »). Espaces fines insécables
// entre les milliers. Sans React : testable avec Node.

import { NBSP, NNBSP } from '@/src/utils/frenchSpaces';

const MINUS = '−';
const formats = new Map<number, Intl.NumberFormat>();
function format(decimals: number): Intl.NumberFormat {
  let f = formats.get(decimals);
  if (!f) {
    f = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    formats.set(decimals, f);
  }
  return f;
}

function body(n: number): string {
  const abs = Math.abs(n);
  const decimals = Math.abs(abs - Math.round(abs)) < 0.005 ? 0 : 2;
  return `${format(decimals).format(decimals === 0 ? Math.round(abs) : abs).replace(/\s/g, NNBSP)}${NBSP}€`;
}

const isZero = (n: number) => Math.abs(n) < 0.005;

// « 1 287 € », « 23,50 € », « −40 € »
export function euros(n: number): string {
  return `${n < 0 && !isZero(n) ? MINUS : ''}${body(n)}`;
}

// « + 20 € », « − 675 € », « 0 € »
export function signedEuros(n: number): string {
  if (isZero(n)) return body(0);
  return `${n > 0 ? '+' : MINUS}${NBSP}${body(n)}`;
}
