// Courbe du solde du mois (mode Détaillé) : réelle jusqu'à aujourd'hui,
// projetée jusqu'à la fin du mois avec les charges fixes à venir et le
// rythme de dépenses moyen du mois. Fonctions pures, testables avec Node.

import { addDays, daysBetween, firstOfMonth, lastOfMonth, type Day } from './dates';
import { mainIncome } from './calc';
import type { Balance, Entry, Recurring } from './model';

export type CurvePoint = { day: Day; value: number; projected: boolean };

// Mouvement d'une journée : récurrents qui tombent ce jour-là et ponctuels datés
function dayMove(recurring: readonly Recurring[], entries: readonly Entry[], day: Day, withEntries: boolean): number {
  const n = Number(day.slice(8));
  const last = Number(lastOfMonth(day).slice(8));
  let move = 0;
  for (const r of recurring) {
    if (r.day === null) continue;
    // Un jour au-delà de la fin du mois tombe le dernier jour
    const hits = r.day === n || (n === last && r.day > last);
    if (!hits) continue;
    move += r.type === 'revenu' ? r.amount : -r.amount;
  }
  if (withEntries) {
    for (const e of entries) if (e.on === day) move += e.type === 'revenu' ? e.amount : e.type === 'depense' ? -e.amount : 0;
  }
  return move;
}

// Rythme de dépenses moyen du mois : dépenses notées jusqu'ici, par jour écoulé
export function dailyPace(entries: readonly Entry[], today: Day): number {
  const first = firstOfMonth(today);
  const spent = entries.filter((e) => e.type === 'depense' && e.on >= first && e.on <= today).reduce((s, e) => s + e.amount, 0);
  return spent / (daysBetween(first, today) + 1);
}

export function monthCurve({
  recurring,
  balances,
  entries,
  today,
}: {
  recurring: readonly Recurring[];
  balances: readonly Balance[];
  entries: readonly Entry[];
  today: Day;
}): { points: CurvePoint[]; end: number } | null {
  if (balances.length === 0) return null;
  const first = firstOfMonth(today);
  const last = lastOfMonth(today);
  // Point de départ : le dernier relevé d'avant le mois, sinon le premier du mois
  const before = [...balances].reverse().find((b) => b.on < first) ?? null;
  const inMonth = balances.filter((b) => b.on >= first && b.on <= today);
  let value: number | null = null;
  let day: Day;
  if (before) {
    value = before.amount;
    day = addDays(before.on, 1);
    while (day < first) {
      value += dayMove(recurring, entries, day, true);
      day = addDays(day, 1);
    }
  } else if (inMonth.length) {
    day = inMonth[0].on;
  } else return null;

  const points: CurvePoint[] = [];
  for (; day <= today; day = addDays(day, 1)) {
    const reading = inMonth.find((b) => b.on === day);
    if (reading) value = reading.amount;
    else if (value !== null) value += dayMove(recurring, entries, day, true);
    if (value !== null) points.push({ day, value: round(value), projected: false });
  }
  if (value === null) return null;
  const pace = dailyPace(entries, today);
  // Solde attendu en fin de mois : avant la paie quand elle tombe le dernier
  // jour (la courbe montre son arrivée, le chiffre ce qui reste avant elle)
  const pay = mainIncome(recurring);
  let beforePay: number | null = null;
  for (day = addDays(today, 1); day <= last; day = addDays(day, 1)) {
    if (day === last && pay?.day !== null && pay?.day !== undefined && pay.day >= Number(last.slice(8))) beforePay = value - pace;
    value += dayMove(recurring, entries, day, false) - pace;
    points.push({ day, value: round(value), projected: true });
  }
  return { points, end: round(beforePay ?? value) };
}

const round = (n: number) => Math.round(n * 100) / 100;
