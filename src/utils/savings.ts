// Réponse de GET /savings lue une fois, à son arrivée : listes, nombres et
// rapprochement toujours présents, pour qu'une réponse incomplète ne fasse
// jamais planter l'écran Épargne. Fonctions pures, testables avec Node.

export type SavingsGoal = { id: number | string | null; label: string; target: number | null; current: number };
export type Reconciliation = {
  epargne_mensuelle: number;
  affecte_mensuel: number;
  has_cashflow_epargne: boolean;
  depassement: { actif: boolean; montant: number };
  surplus: { actif: boolean; montant: number };
};
export type SavingsData = { goals: SavingsGoal[]; just_achieved: SavingsGoal[]; reminders_count: number; reconciliation: Reconciliation | null };

type AnyRecord = Record<string, unknown>;
const isRecord = (v: unknown): v is AnyRecord => !!v && typeof v === 'object' && !Array.isArray(v);
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : Number(v) || 0);

function goal(g: AnyRecord): SavingsGoal {
  const target = g.target_amount ?? g.target;
  const name = g.label ?? g.title ?? g.name;
  return {
    id: typeof g.id === 'number' || typeof g.id === 'string' ? g.id : null,
    label: typeof name === 'string' && name.trim() !== '' ? name : 'Objectif',
    target: target === null || target === undefined || num(target) <= 0 ? null : num(target),
    current: num(g.current_amount ?? g.current),
  };
}

function flag(v: unknown): { actif: boolean; montant: number } {
  const r = isRecord(v) ? v : {};
  return { actif: r.actif === true, montant: num(r.montant) };
}

export function normalizeSavings(raw: unknown): SavingsData {
  const r = isRecord(raw) ? raw : {};
  const rec = isRecord(r.reconciliation) ? r.reconciliation : null;
  return {
    goals: Array.isArray(r.goals) ? r.goals.filter(isRecord).map(goal) : [],
    just_achieved: Array.isArray(r.just_achieved) ? r.just_achieved.filter(isRecord).map(goal) : [],
    reminders_count: num(r.reminders_count),
    reconciliation: rec
      ? {
          epargne_mensuelle: num(rec.epargne_mensuelle),
          affecte_mensuel: num(rec.affecte_mensuel),
          has_cashflow_epargne: rec.has_cashflow_epargne === true,
          depassement: flag(rec.depassement),
          surplus: flag(rec.surplus),
        }
      : null,
  };
}
