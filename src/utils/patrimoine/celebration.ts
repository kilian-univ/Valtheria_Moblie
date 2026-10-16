// Une seule célébration pour tout ce qui est gagné en même temps (par exemple
// à la première ouverture) : objectifs atteints et étapes, réunis, sans
// doublon ; ce qui arrive pendant qu'elle est ouverte s'y ajoute.
// Sans React : testable avec Node.

import { MILESTONES, type MilestoneKey } from './milestones';

export type CelebrationItems = { goals: string[]; milestones: MilestoneKey[] };

const WORDS = ['', 'une', 'deux', 'trois', 'quatre', 'cinq'];
const count = (n: number) => WORDS[n] ?? String(n);
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const titleOf = (k: MilestoneKey) => MILESTONES.find((m) => m.key === k)?.title ?? k;

export function mergeCelebration(current: CelebrationItems | null, next: CelebrationItems): CelebrationItems {
  const goals = [...(current?.goals ?? [])];
  for (const g of next.goals) if (!goals.includes(g)) goals.push(g);
  const milestones = [...(current?.milestones ?? [])];
  for (const m of next.milestones) if (!milestones.includes(m)) milestones.push(m);
  // Étapes dans l'ordre du profil
  milestones.sort((a, b) => MILESTONES.findIndex((m) => m.key === a) - MILESTONES.findIndex((m) => m.key === b));
  return { goals, milestones };
}

export function celebrationText(items: CelebrationItems): { title: string; lines: string[] } | null {
  const { goals, milestones } = items;
  if (goals.length === 0 && milestones.length === 0) return null;
  let title: string;
  if (goals.length === 1) title = `Bravo, tu as atteint ton objectif « ${goals[0]} » !`;
  else if (goals.length > 1) title = `Bravo, tu as atteint ${count(goals.length)} objectifs !`;
  else if (milestones.length === 1) title = `Nouvelle étape : ${titleOf(milestones[0])} !`;
  else title = `${capitalize(count(milestones.length))} nouvelles étapes de ton patrimoine !`;

  const lines = [
    ...(goals.length > 1 ? goals.map((g) => `Objectif atteint : ${g}`) : []),
    ...(goals.length === 0 && milestones.length === 1 ? [] : milestones.map((m) => `Étape : ${titleOf(m)}`)),
  ];
  return { title, lines };
}
