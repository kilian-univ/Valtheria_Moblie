// Devises du suivi de patrimoine : tout est affiché en euros, converti de la
// même façon partout, au taux du jour que le serveur applique déjà à la liste
// (valeur en euros ÷ valeur dans la devise de la position). Quand un montant
// d'origine est dans une autre devise, il est montré aussi : « 81,46 $, soit
// 72,45 € ». Sans React : testable avec Node.

import { money } from './format';
import type { Position } from './model';

// Euros pour une unité de chaque devise
export type Rates = Readonly<Record<string, number>>;

// Taux de la liste : ceux de chaque position (même conversion que sa valeur en
// euros), le dollar à défaut par le taux EUR/USD du serveur
export function ratesOf(positions: readonly Position[], eurUsd: number | null): Rates {
  const rates: Record<string, number> = { EUR: 1 };
  if (eurUsd !== null && eurUsd > 0) rates.USD = 1 / eurUsd;
  for (const p of positions) {
    const cur = p.currency.toUpperCase();
    if (cur === 'EUR') continue;
    if (p.valueEur !== null && p.value > 0) rates[cur] = p.valueEur / p.value;
    else if (p.investedEur !== null && p.invested > 0 && rates[cur] === undefined) rates[cur] = p.investedEur / p.invested;
  }
  return rates;
}

// Montant converti en euros ; null si le taux de la devise est inconnu
export function toEur(amount: number, currency: string, rates: Rates): number | null {
  const rate = rates[currency.toUpperCase()];
  return rate === undefined ? null : amount * rate;
}

// Euros, sinon le montant d'origine (taux inconnu)
export function eurOr(amount: number, currency: string, rates: Rates): { value: number; currency: string } {
  const eur = toEur(amount, currency, rates);
  return eur === null ? { value: amount, currency } : { value: eur, currency: 'EUR' };
}

type MoneyOpts = { hidden?: boolean; exact?: boolean };

// « 72,45 € » ; « 81,46 $, soit 72,45 € » quand l'origine est dans une autre
// devise ; « 81,46 $ » si son taux est inconnu
export function moneyEur(amount: number, currency: string, rates: Rates, opts: MoneyOpts = {}): string {
  const cur = currency.toUpperCase();
  const eur = toEur(amount, cur, rates);
  if (cur === 'EUR' || eur === null) return money(amount, { ...opts, currency: cur });
  return `${money(amount, { ...opts, currency: cur })}, soit ${money(eur, opts)}`;
}

// Montant d'origine seul, quand il n'est pas en euros (pour une ligne discrète
// sous un montant déjà affiché en euros) ; null en euros
export function originalNote(amount: number, currency: string, opts: MoneyOpts = {}): string | null {
  const cur = currency.toUpperCase();
  return cur === 'EUR' ? null : money(amount, { ...opts, currency: cur });
}
