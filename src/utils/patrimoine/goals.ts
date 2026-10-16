// Objectifs du suivi de patrimoine (sur le téléphone) : l'épargne de
// précaution, proposée par défaut, et des objectifs personnels.
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

// Un objectif personnel se mesure sur la valeur totale du patrimoine
export function goalGauge(goal: Goal, totalValue: number): Gauge {
  return gauge(Math.max(0, totalValue), goal.amount);
}

// Objectifs atteints pour la première fois (à fêter, puis notés atteints)
export function newlyReached(goals: readonly Goal[], totalValue: number): Goal[] {
  return goals.filter((g) => !g.reachedAt && goalGauge(g, totalValue).reached);
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
