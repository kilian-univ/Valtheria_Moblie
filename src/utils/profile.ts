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
