// Calculs du profil et des réglages, sans React : testables avec Node.

import type { Module, Lesson } from '@/src/context/ApiContext';
import type { Universe } from '@/src/lesson/model';
import { completedCount, currentLesson, totalCount } from './learning';
import { MEDALS } from './streakRewards';
import { universeEntry } from './universes';

// Niveau du site (LessonCompletionService::levelFromXp) : linéaire, un
// niveau tous les 200 XP, à partir du niveau 1
export const XP_PER_LEVEL = 200;

export function levelFromXp(xp: number): number {
  const safe = Number.isFinite(xp) ? Math.max(0, Math.floor(xp)) : 0;
  return Math.floor(safe / XP_PER_LEVEL) + 1;
}

export type LevelInfo = {
  level: number;
  next: number;
  // XP gagnés dans le niveau en cours, et ceux qui restent avant le suivant
  into: number;
  remaining: number;
  // Progression vers le niveau suivant, de 0 à 1 (anneau doré)
  ratio: number;
};

export function levelInfo(xp: number): LevelInfo {
  const safe = Number.isFinite(xp) ? Math.max(0, Math.floor(xp)) : 0;
  const level = levelFromXp(safe);
  const into = safe % XP_PER_LEVEL;
  return { level, next: level + 1, into, remaining: XP_PER_LEVEL - into, ratio: into / XP_PER_LEVEL };
}

// Lecteur d'écran : « Niveau 10, encore 225 XP avant le niveau 11 »
export function levelA11y(info: LevelInfo): string {
  return `Niveau ${info.level}, encore ${info.remaining} XP avant le niveau ${info.next}`;
}

// E-mail affiché tronqué : « quentin-08@… » au-delà de max caractères
export function truncateEmail(email: string | null | undefined, max = 16): string {
  const e = (email ?? '').trim();
  if (e.length <= max) return e;
  const at = e.indexOf('@');
  const local = at > 0 ? e.slice(0, at) : e;
  return `${local.slice(0, Math.max(1, max - 2))}@…`;
}

// Initiale de la photo par défaut
export function initialOf(pseudo: string | null | undefined): string {
  const first = (pseudo ?? '').trim().charAt(0);
  return first ? first.toLocaleUpperCase('fr-FR') : '?';
}

// Médailles de série gagnées (gardées si la série casse)
export function medalsEarned(best: number, streak: number): number {
  const reached = Math.max(best || 0, streak || 0);
  return MEDALS.filter((m) => reached >= m.days).length;
}

export type ObjectiveProgress = {
  universe: Universe | null;
  done: number;
  total: number;
  // Prochaine leçon disponible de l'univers (première non terminée du
  // premier module non fini), sinon null : la page de l'univers s'ouvre
  next: { module: Module; lesson: Lesson } | null;
};

// Avancée dans l'univers lié à l'objectif
export function objectiveProgress(slug: string, universes: Universe[], modules: Module[]): ObjectiveProgress {
  const universe = universes.find((u) => u.slug === slug) ?? null;
  if (!universe) return { universe: null, done: 0, total: 0, next: null };
  const entry = universeEntry(universe, modules);
  let next: ObjectiveProgress['next'] = null;
  for (const module of entry.modules) {
    const lesson = currentLesson(module);
    if (lesson) {
      next = { module, lesson };
      break;
    }
  }
  return {
    universe,
    done: entry.modules.reduce((n, m) => n + completedCount(m), 0),
    total: entry.modules.reduce((n, m) => n + totalCount(m), 0),
    next,
  };
}

// Univers terminé : le suivant conseillé, dans l'ordre des univers, le premier
// qui a encore des leçons à faire (sinon null)
export function nextUniverse(slug: string, universes: Universe[], modules: Module[]): Universe | null {
  const sorted = [...universes].sort((a, b) => a.position - b.position || a.id - b.id);
  const i = sorted.findIndex((u) => u.slug === slug);
  const order = i < 0 ? sorted : [...sorted.slice(i + 1), ...sorted.slice(0, i)];
  return (
    order.find((u) => {
      const e = universeEntry(u, modules);
      return e.modules.length > 0 && e.progress < 1;
    }) ?? null
  );
}

// Univers sans leçon publiée : le plus proche (par position) qui en a, sinon
// null (les leçons découvertes prennent le relais)
export function nearestUniverseWithLessons(slug: string, universes: Universe[], modules: Module[]): Universe | null {
  const sorted = [...universes].sort((a, b) => a.position - b.position || a.id - b.id);
  const own = sorted.find((u) => u.slug === slug);
  const withLessons = sorted.filter(
    (u) => u.slug !== slug && universeEntry(u, modules).modules.some((m) => totalCount(m) > 0)
  );
  if (withLessons.length === 0) return null;
  if (!own) return withLessons[0];
  return withLessons.reduce((best, u) => (Math.abs(u.position - own.position) < Math.abs(best.position - own.position) ? u : best));
}

// Dernière médaille gagnée (nombre de jours), sinon null
export function lastMedalDays(best: number, streak: number): number | null {
  const reached = Math.max(best || 0, streak || 0);
  const earned = MEDALS.filter((m) => reached >= m.days);
  return earned.length > 0 ? earned[earned.length - 1].days : null;
}

// Objectif tel que le serveur l'accepte (User::OBJECTIVES du site :
// comprendre, epargner, investir, projet, rouge, decouvrir). Le logement y
// est encore « projet » (relu en logement par toObjective) ; crypto et
// impôts n'y existent pas : null, l'objectif reste sur le téléphone.
const SERVER_OBJECTIVE: Record<string, string | null> = {
  epargner: 'epargner',
  investir: 'investir',
  decouvrir: 'decouvrir',
  logement: 'projet',
  crypto: null,
  impots: null,
};

export function serverObjective(objective: string): string | null {
  return SERVER_OBJECTIVE[objective] ?? null;
}
