// Enveloppes (mode Détaillé) : une catégorie avec un plafond mensuel, et ce
// qui y est dépensé ce mois-ci. Alerte douce à un seuil réglable (80 % par
// défaut) ; la jauge passe au rouge au-delà du plafond. Fonctions pures,
// testables avec Node.

import type { BudgetCategory, Entry } from './model';

export type EnvelopeState = { category: string; color: string; cap: number; spent: number; ratio: number; over: boolean; alert: boolean };

// Dépenses d'un mois (« 2026-10 ») par catégorie
export function spentByCategory(entries: readonly Entry[], month: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const e of entries) {
    if (e.type !== 'depense' || !e.on.startsWith(month)) continue;
    const c = e.category ?? 'Autres';
    out[c] = (out[c] ?? 0) + e.amount;
  }
  return out;
}

export function envelopes(categories: readonly BudgetCategory[], entries: readonly Entry[], month: string, alertPct: number): EnvelopeState[] {
  const spent = spentByCategory(entries, month);
  return categories
    .filter((c) => c.envelopeCap !== null && c.envelopeCap > 0)
    .map((c) => {
      const cap = c.envelopeCap as number;
      const s = spent[c.name] ?? 0;
      const ratio = s / cap;
      return { category: c.name, color: c.color, cap, spent: s, ratio, over: s > cap + 0.005, alert: ratio >= alertPct / 100 };
    });
}

// Enveloppe qui vient de franchir le seuil d'alerte (ou le plafond) avec une
// dépense : la phrase douce à montrer, sinon null
export function envelopeNotice(before: readonly EnvelopeState[], after: readonly EnvelopeState[]): string | null {
  for (const a of after) {
    const b = before.find((x) => x.category === a.category);
    if (a.over && !(b?.over ?? false)) return `Ton enveloppe ${a.category} est dépassée ce mois-ci. Pas de panique : le mois prochain, elle repart de zéro.`;
    if (a.alert && !(b?.alert ?? false)) return `Tu as utilisé ${Math.round(a.ratio * 100)} % de ton enveloppe ${a.category}. Il reste ${Math.max(0, Math.round(a.cap - a.spent))} € jusqu’à la fin du mois.`;
  }
  return null;
}

// Enveloppe dépassée les deux derniers mois terminés (remarque de Val)
export function envelopeOverTwice(categories: readonly BudgetCategory[], entries: readonly Entry[], months: [string, string]): string | null {
  for (const c of categories) {
    if (c.envelopeCap === null) continue;
    const over = months.every((m) => (spentByCategory(entries, m)[c.name] ?? 0) > (c.envelopeCap as number) + 0.005);
    if (over) return c.name;
  }
  return null;
}
