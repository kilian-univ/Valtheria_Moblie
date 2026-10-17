// Calculs de l'onglet Apprendre, à partir de getModules() uniquement.
// Fonctions pures, sans React : testables avec Node.
//
// Règles :
// - les modules se suivent dans n'importe quel ordre ;
// - dans un module, les leçons sont dans l'ordre du tableau renvoyé par le
//   serveur : la première non terminée est « en cours », les suivantes sont
//   verrouillées ;
// - l'état d'un module se déduit de ses leçons (pas de lessons_count /
//   lessons_completed, pour éviter toute incohérence entre les deux).

import type { Lesson, Module } from '@/src/context/ApiContext';
import { LEVEL_ORDER, levelKey, levelLabel } from './levelNames';

export type LessonStatus = 'completed' | 'current' | 'locked';

export type LessonView = {
  lesson: Lesson;
  // Position dans le module, à partir de 1
  number: number;
  total: number;
  status: LessonStatus;
  // Seule la première leçon verrouillée porte la raison « Après <titre> »
  isFirstLocked: boolean;
  previousTitle: string | null;
};

export type ModuleState = 'done' | 'started' | 'new';

export function lessonViews(module: Module): LessonView[] {
  const lessons = module.lessons ?? [];
  let currentFound = false;
  let firstLockedFound = false;

  return lessons.map((lesson, index) => {
    let status: LessonStatus;
    if (lesson.completed) {
      status = 'completed';
    } else if (!currentFound) {
      currentFound = true;
      status = 'current';
    } else {
      status = 'locked';
    }

    const isFirstLocked = status === 'locked' && !firstLockedFound;
    if (isFirstLocked) firstLockedFound = true;

    return {
      lesson,
      number: index + 1,
      total: lessons.length,
      status,
      isFirstLocked,
      previousTitle: index > 0 ? lessons[index - 1].title : null,
    };
  });
}

export function completedCount(module: Module): number {
  return (module.lessons ?? []).filter((l) => l.completed).length;
}

export function totalCount(module: Module): number {
  return (module.lessons ?? []).length;
}

export function moduleState(module: Module): ModuleState {
  const total = totalCount(module);
  const done = completedCount(module);
  if (total > 0 && done === total) return 'done';
  if (done > 0) return 'started';
  return 'new';
}

export function moduleProgress(module: Module): number {
  const total = totalCount(module);
  return total === 0 ? 0 : completedCount(module) / total;
}

// Prochaine leçon non terminée du module, ou null s'il est fini (ou vide)
export function currentLesson(module: Module): Lesson | null {
  return (module.lessons ?? []).find((l) => !l.completed) ?? null;
}

// Modules qui ont au moins une leçon : un module vide ne se commence pas
function playable(modules: Module[]): Module[] {
  return modules.filter((m) => totalCount(m) > 0);
}

export function findModule(modules: Module[], id: number | null | undefined): Module | null {
  if (id === null || id === undefined) return null;
  return modules.find((m) => m.id === id) ?? null;
}

export type UpNext = { module: Module; lesson: Lesson };

// Leçon à suivre : celle du dernier module ouvert s'il n'est pas terminé,
// sinon celle du premier module non terminé dans l'ordre du serveur.
export function pickUpNext(modules: Module[], lastModuleId: number | null): UpNext | null {
  const last = findModule(playable(modules), lastModuleId);
  const lastLesson = last ? currentLesson(last) : null;
  if (last && lastLesson) return { module: last, lesson: lastLesson };

  for (const module of playable(modules)) {
    const lesson = currentLesson(module);
    if (lesson) return { module, lesson };
  }
  return null;
}

// Premier module non terminé après `moduleId` dans l'ordre du serveur, en
// repartant du début si besoin. null si tous les autres sont terminés.
export function nextModuleAfter(modules: Module[], moduleId: number): Module | null {
  const list = playable(modules);
  const start = list.findIndex((m) => m.id === moduleId);
  for (let step = 1; step <= list.length; step++) {
    const candidate = list[(start + step) % list.length];
    if (candidate.id !== moduleId && moduleState(candidate) !== 'done') return candidate;
  }
  return null;
}

export function hasAnyCompleted(modules: Module[]): boolean {
  return modules.some((m) => completedCount(m) > 0);
}

export function allModulesDone(modules: Module[]): boolean {
  const list = playable(modules);
  return list.length > 0 && list.every((m) => moduleState(m) === 'done');
}

// ---------------------------------------------------------------------------
// Situation de la section « À suivre » de l'accueil
// ---------------------------------------------------------------------------
export type HomeSituation =
  | { kind: 'empty' }
  | { kind: 'allDone' }
  | { kind: 'welcome'; module: Module }
  | { kind: 'moduleDone'; finished: Module; next: Module | null }
  | { kind: 'upNext'; module: Module; lesson: Lesson; almostDone: boolean };

export function resolveHomeSituation(
  modules: Module[],
  lastModuleId: number | null,
  celebratedModuleIds: number[]
): HomeSituation {
  const list = playable(modules);
  if (list.length === 0) return { kind: 'empty' };
  if (allModulesDone(list)) return { kind: 'allDone' };
  // Première visite : on conseille le module déjà ouvert s'il y en a un
  if (!hasAnyCompleted(list)) {
    return { kind: 'welcome', module: findModule(list, lastModuleId) ?? list[0] };
  }

  // Le dernier module ouvert vient d'être terminé : on le fête une seule fois
  const last = findModule(list, lastModuleId);
  if (last && moduleState(last) === 'done' && !celebratedModuleIds.includes(last.id)) {
    return { kind: 'moduleDone', finished: last, next: nextModuleAfter(list, last.id) };
  }

  const upNext = pickUpNext(list, lastModuleId);
  if (!upNext) return { kind: 'allDone' };
  const remaining = totalCount(upNext.module) - completedCount(upNext.module);
  return { kind: 'upNext', module: upNext.module, lesson: upNext.lesson, almostDone: remaining === 1 };
}

// ---------------------------------------------------------------------------
// Libellés
// ---------------------------------------------------------------------------

// "0 leçon", "1 leçon", "2 leçons" (le français garde le singulier sous 2)
export function lessonsWord(count: number): string {
  return count >= 2 ? 'leçons' : 'leçon';
}

// "3 leçons sur 8"
export function lessonsProgressLabel(done: number, total: number): string {
  return `${done} ${lessonsWord(done)} sur ${total}`;
}

// Niveau d'un module → libellé français (Entrée, Débutant, Intermédiaire,
// Avancé, Expert), anciennes valeurs comprises. Toute autre valeur est
// masquée (null), jamais affichée brute.
export function difficultyLabel(raw: unknown): string | null {
  const key = levelKey(raw);
  return key !== null && (LEVEL_ORDER as readonly string[]).includes(key) ? levelLabel(key) : null;
}

// Sous-titre d'un module dans les listes de l'accueil
export function moduleSubtitle(module: Module): string {
  const total = totalCount(module);
  const state = moduleState(module);
  if (state === 'done') return 'Terminé';
  if (state === 'started') return lessonsProgressLabel(completedCount(module), total);
  const difficulty = difficultyLabel(module.difficulty);
  const count = `${total} ${lessonsWord(total)}`;
  return difficulty ? `${difficulty}, ${count}` : count;
}
