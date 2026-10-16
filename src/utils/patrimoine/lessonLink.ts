// Lien d'une remarque de Val vers la leçon qui en parle : le module de
// l'univers dont le titre (ou le slug) contient un des mots, sinon l'univers,
// sinon Apprendre. Sans React : testable avec Node.

import type { LessonTarget } from './valTips';

type ModuleLike = { id: number; slug?: string; title: string };
type UniverseLike = { id: number; slug: string; moduleIds: number[] };

export type LessonHref =
  | { pathname: '/apprendre/module/[moduleId]'; params: { moduleId: string } }
  | { pathname: '/apprendre/univers/[universeId]'; params: { universeId: string } }
  | { pathname: '/apprendre' };

const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

export function lessonHref(target: LessonTarget, modules: readonly ModuleLike[], universes: readonly UniverseLike[]): LessonHref {
  const universe = universes.find((u) => u.slug === target.universe);
  const pool = universe ? modules.filter((m) => universe.moduleIds.includes(m.id)) : modules;
  const words = target.keywords.map(fold);
  for (const word of words) {
    const found = pool.find((m) => fold(`${m.title} ${m.slug ?? ''}`).includes(word));
    if (found) return { pathname: '/apprendre/module/[moduleId]', params: { moduleId: String(found.id) } };
  }
  if (universe) return { pathname: '/apprendre/univers/[universeId]', params: { universeId: String(universe.id) } };
  return { pathname: '/apprendre' };
}
