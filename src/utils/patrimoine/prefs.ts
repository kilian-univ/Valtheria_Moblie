// Préférences du suivi de patrimoine gardées sur le téléphone, par compte :
// mode discret, versements sur les livrets, épargne de précaution, objectifs,
// étapes, mois de versement. Lecture prudente. Sans React : testable avec Node.

import { clampMonths, EMERGENCY_MONTHS, type Emergency, type Goal } from './goals';
import { MILESTONES, type Earned } from './milestones';

// Versement sur un livret (date ISO, montant) : il compte pour la régularité
export type LivretDeposit = { at: string; amount: number; positionId: number | null };

export type PatrimoinePrefs = {
  // Mode discret : tous les montants masqués par des points
  discreet: boolean;
  livretDeposits: LivretDeposit[];
  emergency: Emergency;
  goals: Goal[];
  milestones: Earned;
  // Mois avec au moins un versement (« 2026-10 »), relevés au dernier passage
  // sur Mon patrimoine ; lus par le profil
  months: string[];
};

export const DEFAULT_PREFS: PatrimoinePrefs = {
  discreet: false,
  livretDeposits: [],
  emergency: { monthlyExpenses: null, months: EMERGENCY_MONTHS.default },
  goals: [],
  milestones: {},
  months: [],
};

const DEPOSITS_KEPT = 400;
const GOALS_MAX = 20;

const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const str = (v: unknown): string | null => (typeof v === 'string' && v !== '' ? v : null);

export function parsePrefs(raw: unknown): PatrimoinePrefs {
  const r = obj(raw);
  const deposits = (Array.isArray(r.livretDeposits) ? r.livretDeposits : [])
    .map((x) => {
      const d = obj(x);
      return typeof d.at === 'string' && typeof d.amount === 'number' && d.amount > 0
        ? { at: d.at, amount: d.amount, positionId: typeof d.positionId === 'number' ? d.positionId : null }
        : null;
    })
    .filter((d): d is LivretDeposit => d !== null);
  const e = obj(r.emergency);
  const expenses = typeof e.monthlyExpenses === 'number' && e.monthlyExpenses > 0 ? e.monthlyExpenses : null;
  const goals = (Array.isArray(r.goals) ? r.goals : [])
    .map((x) => {
      const g = obj(x);
      const id = str(g.id);
      const name = str(g.name);
      return id && name && typeof g.amount === 'number' && g.amount > 0
        ? { id, name, amount: g.amount, date: str(g.date), createdAt: str(g.createdAt) ?? new Date(0).toISOString(), reachedAt: str(g.reachedAt) }
        : null;
    })
    .filter((g): g is Goal => g !== null)
    .slice(0, GOALS_MAX);
  const m = obj(r.milestones);
  const milestones: Earned = {};
  for (const { key } of MILESTONES) {
    const at = str(m[key]);
    if (at) milestones[key] = at;
  }
  const months = (Array.isArray(r.months) ? r.months : []).filter((x): x is string => typeof x === 'string' && /^\d{4}-\d{2}$/.test(x));
  return {
    discreet: r.discreet === true,
    livretDeposits: deposits.slice(-DEPOSITS_KEPT),
    emergency: { monthlyExpenses: expenses, months: clampMonths(typeof e.months === 'number' ? e.months : EMERGENCY_MONTHS.default) },
    goals,
    milestones,
    months: [...new Set(months)].sort(),
  };
}

export function addLivretDeposit(prefs: PatrimoinePrefs, deposit: LivretDeposit): PatrimoinePrefs {
  if (!(deposit.amount > 0)) return prefs;
  return { ...prefs, livretDeposits: [...prefs.livretDeposits, deposit].slice(-DEPOSITS_KEPT) };
}
