// Objectifs du suivi de patrimoine (sur le téléphone) : l'épargne de
// précaution, proposée par défaut, et des objectifs personnels, chacun
// mesuré sur les placements qui lui sont reliés.
// Sans React : testable avec Node.

import { riskOf } from './analysis';
import { valueEurOf, type Position } from './model';

export const EMERGENCY_MONTHS = { min: 3, max: 6, default: 3 } as const;

export type Emergency = { monthlyExpenses: number | null; months: number };

export type Goal = {
  id: string;
  name: string;
  amount: number;
  // Échéance (AAAA-MM-JJ), facultative
  date: string | null;
  createdAt: string;
  reachedAt: string | null;
  // Placements reliés ; null : les placements sans risque, suivis
  // automatiquement (objectifs créés avant le choix des placements)
  positionIds: number[] | null;
};

export type Gauge = { current: number; target: number; ratio: number; reached: boolean };

const gauge = (current: number, target: number): Gauge => ({
  current,
  target,
  ratio: target > 0 ? Math.max(0, Math.min(1, current / target)) : 0,
  reached: target > 0 && current >= target - 0.005,
});

// Ce qui compte pour l'épargne de précaution : les actifs sans risque
export function safeSavings(positions: readonly Position[]): number {
  return positions.filter((p) => riskOf(p) === 'sans_risque').reduce((s, p) => s + Math.max(0, valueEurOf(p)), 0);
}

export function clampMonths(months: number): number {
  if (!Number.isFinite(months)) return EMERGENCY_MONTHS.default;
  return Math.max(EMERGENCY_MONTHS.min, Math.min(EMERGENCY_MONTHS.max, Math.round(months)));
}

// Objectif : dépenses mensuelles × nombre de mois choisi (3 à 6)
export function emergencyGauge(e: Emergency, positions: readonly Position[]): Gauge | null {
  if (!e.monthlyExpenses || e.monthlyExpenses <= 0) return null;
  return gauge(safeSavings(positions), e.monthlyExpenses * clampMonths(e.months));
}

// Mois de dépenses couverts par l'épargne sans risque (« 2,4 mois »)
export function monthsCovered(e: Emergency, positions: readonly Position[]): number | null {
  if (!e.monthlyExpenses || e.monthlyExpenses <= 0) return null;
  return safeSavings(positions) / e.monthlyExpenses;
}

const isSafe = (p: Position) => riskOf(p) === 'sans_risque';

// Placements reliés par défaut à un nouvel objectif : les placements sans risque
export function defaultGoalPositionIds(positions: readonly Position[]): number[] {
  return positions.filter(isSafe).map((p) => p.id);
}

// Placements détenus sur lesquels l'objectif se mesure (un placement vendu
// depuis n'y est plus)
export function linkedPositions(goal: Pick<Goal, 'positionIds'>, positions: readonly Position[]): Position[] {
  const ids = goal.positionIds;
  return ids === null ? positions.filter(isSafe) : positions.filter((p) => ids.includes(p.id));
}

// Un objectif personnel se mesure sur la valeur de ses placements ; null
// sans placement relié (rien à suivre)
export function goalGauge(goal: Goal, positions: readonly Position[]): Gauge | null {
  const linked = linkedPositions(goal, positions);
  if (linked.length === 0) return null;
  return gauge(linked.reduce((s, p) => s + Math.max(0, valueEurOf(p)), 0), goal.amount);
}

// Objectifs atteints pour la première fois (à fêter, puis notés atteints)
export function newlyReached(goals: readonly Goal[], positions: readonly Position[]): Goal[] {
  return goals.filter((g) => !g.reachedAt && !!goalGauge(g, positions)?.reached);
}

const AT_MOST_NAMED = 3;

// « mesuré sur ton Livret A et ton LDDS » ; au-delà de trois placements :
// « mesuré sur ton Livret A, ton LDDS et 3 autres placements »
export function measuredOnText(linked: readonly Pick<Position, 'name' | 'ticker'>[]): string | null {
  const names = linked.map((p) => `ton ${p.name || p.ticker}`);
  if (names.length === 0) return null;
  const shown = names.length > AT_MOST_NAMED ? [...names.slice(0, AT_MOST_NAMED - 1), `${names.length - AT_MOST_NAMED + 1} autres placements`] : names;
  const list = shown.length === 1 ? shown[0] : `${shown.slice(0, -1).join(', ')} et ${shown[shown.length - 1]}`;
  return `mesuré sur ${list}`;
}

// Liens changés (l'ordre ne compte pas) : l'objectif se remesure
export function sameLinks(a: readonly number[] | null, b: readonly number[] | null): boolean {
  if (a === null || b === null) return a === b;
  return a.length === b.length && [...a].sort().join() === [...b].sort().join();
}

export function markReached(goals: readonly Goal[], ids: readonly string[], at: string): Goal[] {
  return goals.map((g) => (ids.includes(g.id) && !g.reachedAt ? { ...g, reachedAt: at } : g));
}

export type GoalInput = { name: string; amount: string; date: string | null };

export function validateGoal(input: GoalInput): { ok: true; name: string; amount: number; date: string | null } | { ok: false; message: string } {
  const amount = Number(input.amount.replace(/[\s  ]/g, '').replace(',', '.'));
  if (!input.name.trim()) return { ok: false, message: 'Donne un nom à ton objectif.' };
  if (!(amount > 0)) return { ok: false, message: 'Indique un montant à atteindre.' };
  if (input.date !== null && !/^\d{4}-\d{2}-\d{2}$/.test(input.date)) return { ok: false, message: 'Date invalide.' };
  return { ok: true, name: input.name.trim().slice(0, 60), amount, date: input.date };
}
