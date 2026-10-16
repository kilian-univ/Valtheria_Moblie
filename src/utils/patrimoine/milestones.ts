// Étapes du suivi de patrimoine, à collectionner (profil, à côté des
// médailles). Uniquement la régularité et l'organisation : jamais les gains,
// la performance, ni le nombre d'achats et de ventes. Une étape gagnée le
// reste. Sans React : testable avec Node.

import { valueEurOf, type Position } from './model';

export type MilestoneKey = 'premier_actif' | 'trois_types' | 'six_mois' | 'precaution' | 'premier_objectif';

export const MILESTONES: readonly { key: MilestoneKey; title: string; short: string; hint: string; icon: string }[] = [
  { key: 'premier_actif', short: 'Premier actif', title: 'Premier actif suivi', hint: 'Ajoute un premier actif à ton patrimoine.', icon: 'leaf-outline' },
  { key: 'trois_types', short: 'Trois types', title: 'Trois types d’actifs', hint: 'Suis trois types d’actifs différents (livret, ETF, crypto…).', icon: 'git-branch-outline' },
  { key: 'six_mois', short: 'Six mois', title: 'Six mois de régularité', hint: 'Fais un versement six mois d’affilée.', icon: 'calendar-outline' },
  { key: 'precaution', short: 'Précaution', title: 'Épargne de précaution', hint: 'Atteins ton objectif d’épargne de précaution.', icon: 'shield-checkmark-outline' },
  { key: 'premier_objectif', short: 'Objectif atteint', title: 'Premier objectif atteint', hint: 'Atteins un de tes objectifs personnels.', icon: 'flag-outline' },
];

export type MilestoneContext = {
  positions: readonly Position[];
  bestStreak: number;
  emergencyReached: boolean;
  anyGoalReached: boolean;
};

export function satisfied(ctx: MilestoneContext): MilestoneKey[] {
  const held = ctx.positions.filter((p) => valueEurOf(p) > 0 || p.quantity > 0);
  const out: MilestoneKey[] = [];
  if (held.length >= 1) out.push('premier_actif');
  if (new Set(held.map((p) => p.type)).size >= 3) out.push('trois_types');
  if (ctx.bestStreak >= 6) out.push('six_mois');
  if (ctx.emergencyReached) out.push('precaution');
  if (ctx.anyGoalReached) out.push('premier_objectif');
  return out;
}

export type Earned = Partial<Record<MilestoneKey, string>>;

// Nouvelles étapes (à fêter) et la mémoire mise à jour ; rien n'est retiré
export function earn(earned: Earned, ctx: MilestoneContext, at: string): { earned: Earned; fresh: MilestoneKey[] } {
  const fresh = satisfied(ctx).filter((k) => !earned[k]);
  if (fresh.length === 0) return { earned, fresh };
  const next = { ...earned };
  for (const k of fresh) next[k] = at;
  return { earned: next, fresh };
}
