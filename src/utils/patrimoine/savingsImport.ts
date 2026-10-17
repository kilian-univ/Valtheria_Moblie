// Reprise des objectifs de l'ancien outil Épargne du site (GET /savings)
// dans les objectifs du patrimoine : même nom, montant et échéance, une
// seule fois par compte. Sans React : testable avec Node.

import { GOALS_MAX, type PatrimoinePrefs } from './prefs';

export type SavingsGoalIn = { name: string; amount: number; date: string | null };

const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {});

// Objectifs lisibles de la réponse ; null si la réponse n'en a pas (rien
// n'est alors noté repris : nouvel essai à la prochaine ouverture)
export function readSavingsGoals(raw: unknown): SavingsGoalIn[] | null {
  const goals = obj(raw).goals;
  if (!Array.isArray(goals)) return null;
  return goals
    .map((x) => {
      const g = obj(x);
      const name = typeof g.name === 'string' ? g.name.trim().slice(0, 60) : '';
      const amount = Number(g.target_amount);
      const day = typeof g.target_date === 'string' ? g.target_date.slice(0, 10) : '';
      return name && Number.isFinite(amount) && amount > 0 ? { name, amount, date: /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null } : null;
    })
    .filter((g): g is SavingsGoalIn => g !== null);
}

// Ajoute les objectifs du site (sans doublon, dans la limite des objectifs)
// et note la reprise faite ; rien ne change si elle l'est déjà
export function importSavingsGoals(prefs: PatrimoinePrefs, goals: readonly SavingsGoalIn[], now: Date): PatrimoinePrefs {
  if (prefs.savingsImported) return prefs;
  const at = now.toISOString();
  const added = goals
    .filter((g, i) => goals.findIndex((o) => o.name === g.name && o.amount === g.amount && o.date === g.date) === i)
    .filter((g) => !prefs.goals.some((o) => o.name === g.name && o.amount === g.amount && o.date === g.date))
    .slice(0, Math.max(0, GOALS_MAX - prefs.goals.length))
    .map((g, i) => ({ id: `s${now.getTime()}-${i}`, name: g.name, amount: g.amount, date: g.date, createdAt: at, reachedAt: null }));
  return { ...prefs, goals: [...prefs.goals, ...added], savingsImported: true };
}
