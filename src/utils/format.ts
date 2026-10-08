// Formats d'affichage en français. Intl fr-FR fournit les chiffres et la
// virgule ; les espaces, le signe et la devise sont posés ici à la main, car
// l'espace des milliers renvoyée par Intl varie selon le moteur (U+00A0 ou
// U+202F selon la version d'ICU embarquée par iOS, Android ou Hermes).

const NNBSP = ' '; // espace fine insécable : séparateur des milliers
const NBSP = ' '; // espace insécable : avant €, %, XP et après un signe
const MINUS = '−'; // vrai signe moins

export type Currency = 'EUR' | 'USD';

const CURRENCY_SYMBOL: Record<Currency, string> = { EUR: '€', USD: '$' };

export const MASKED = `•••••${NBSP}€`;

const numberFormats = new Map<string, Intl.NumberFormat>();

function digits(value: number, minDecimals: number, maxDecimals: number): string {
  const key = `${minDecimals}-${maxDecimals}`;
  let formatter = numberFormats.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: minDecimals,
      maximumFractionDigits: maxDecimals,
    });
    numberFormats.set(key, formatter);
  }
  // Toute espace (normale, insécable ou fine) devient une espace fine insécable
  return formatter.format(Math.abs(value)).replace(/[\s  ]/g, NNBSP);
}

// Évite d'afficher "−0,00 €" pour un -0,001 arrondi
function isZeroAt(value: number, decimals: number): boolean {
  return Math.abs(value) < 0.5 / 10 ** decimals;
}

// formatAmount(1600)          → "1 600,00 €"
// formatAmount(-312.4)        → "−312,40 €"
// formatAmount(1600, 'USD')   → "1 600,00 $"
export function formatAmount(value: number, currency: Currency = 'EUR'): string {
  const sign = value < 0 && !isZeroAt(value, 2) ? MINUS : '';
  return `${sign}${digits(value, 2, 2)}${NBSP}${CURRENCY_SYMBOL[currency]}`;
}

// formatVariation(312.4)      → "+ 312,40 €"
// formatVariation(-312.4)     → "− 312,40 €"
// formatVariation(0)          → "0,00 €"
export function formatVariation(value: number, currency: Currency = 'EUR'): string {
  const amount = `${digits(value, 2, 2)}${NBSP}${CURRENCY_SYMBOL[currency]}`;
  if (isZeroAt(value, 2)) return amount;
  return `${value > 0 ? '+' : MINUS}${NBSP}${amount}`;
}

// formatVariationPercent(4.8)  → "+ 4,8 %"
// formatVariationPercent(-0.3) → "− 0,3 %"
export function formatVariationPercent(value: number): string {
  const percent = `${digits(value, 1, 1)}${NBSP}%`;
  if (isZeroAt(value, 1)) return percent;
  return `${value > 0 ? '+' : MINUS}${NBSP}${percent}`;
}

// formatPercent(2.6)   → "2,6 %"
// formatPercent(-2.6)  → "−2,6 %"
export function formatPercent(value: number): string {
  const sign = value < 0 && !isZeroAt(value, 1) ? MINUS : '';
  return `${sign}${digits(value, 1, 1)}${NBSP}%`;
}

// Réservé aux axes de graphique.
// formatCompactAmount(850)      → "850 €"
// formatCompactAmount(12400)    → "12,4 k€"
// formatCompactAmount(1250000)  → "1,3 M€"
export function formatCompactAmount(value: number, currency: Currency = 'EUR'): string {
  const abs = Math.abs(value);
  const sign = value < 0 && abs >= 0.5 ? MINUS : '';
  const symbol = CURRENCY_SYMBOL[currency];
  if (abs >= 1_000_000) return `${sign}${digits(abs / 1_000_000, 0, 1)}${NBSP}M${symbol}`;
  if (abs >= 1_000) return `${sign}${digits(abs / 1_000, 0, 1)}${NBSP}k${symbol}`;
  return `${sign}${digits(abs, 0, 0)}${NBSP}${symbol}`;
}

// formatXp(20) → "+ 20 XP"
export function formatXp(value: number): string {
  const sign = value < 0 ? MINUS : '+';
  return `${sign}${NBSP}${digits(value, 0, 0)}${NBSP}XP`;
}

// Abréviations françaises usuelles (CLDR fr) : liste fixe pour un rendu
// identique sur tous les moteurs.
const SHORT_MONTHS = [
  'janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin',
  'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.',
];

const MINUTE = 60_000;
const DAY = 86_400_000;

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

// Avec now = 15 oct. 2026 à 14 h :
// il y a 20 s            → "à l'instant"
// ce matin à 9 h         → "aujourd'hui"
// 14 oct. 2026           → "hier"
// 12 oct. 2026           → "il y a 3 jours"
// 2 sept. 2026           → "2 sept."
// 12 oct. 2025           → "12 oct. 2025"
// date invalide          → ""
export function formatRelativeDate(input: Date | string | number, now: Date = new Date()): string {
  const date = input instanceof Date ? input : new Date(input);
  const time = date.getTime();
  if (Number.isNaN(time)) return '';

  const elapsed = now.getTime() - time;
  if (elapsed >= 0 && elapsed < MINUTE) return "à l'instant";

  const days = Math.round((startOfDay(now) - startOfDay(date)) / DAY);
  if (days === 0) return "aujourd'hui";
  if (days === 1) return 'hier';
  if (days > 1 && days < 7) return `il y a ${days}${NBSP}jours`;

  const dayMonth = `${date.getDate()}${NBSP}${SHORT_MONTHS[date.getMonth()]}`;
  return date.getFullYear() === now.getFullYear() ? dayMonth : `${dayMonth} ${date.getFullYear()}`;
}
