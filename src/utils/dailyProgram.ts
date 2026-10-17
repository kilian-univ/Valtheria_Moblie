// Programme du jour de l'accueil d'Apprendre (une leçon, une révision), sans
// React : testable avec Node.

import type { Lesson, Module } from '@/src/context/ApiContext';
import type { Universe, ValMood } from '@/src/lesson/model';
import { currentLesson, moduleState, totalCount } from './learning';
import { availableModules } from './levels';
import { type UniverseEntry, universeEntry } from './universes';
import { NBSP } from '@/src/utils/frenchSpaces';

// Leçon terminée sur ce téléphone (mémoire locale : le serveur ne renvoie
// aucune date, voir docs/lot-serveur.md, 4.6)
export type LessonLogEntry = { lessonId: number; moduleId: number; at: string; day: string };

// Dernière activité de chaque module (ISO), d'après la mémoire locale
export function lastActivityByModule(log: readonly LessonLogEntry[]): Map<number, string> {
  const out = new Map<number, string>();
  for (const e of log) {
    const known = out.get(e.moduleId);
    if (!known || e.at > known) out.set(e.moduleId, e.at);
  }
  return out;
}

export type LessonOfDay = { module: Module; lesson: Lesson; universe: Universe | null };

function universeOf(module: Module, universes: readonly Universe[]): Universe | null {
  return universes.find((u) => u.moduleIds.includes(module.id)) ?? null;
}

// Leçon du jour :
// 1. la prochaine leçon du module en cours le plus récent (date connue sur le
//    téléphone, sinon le dernier module ouvert, sinon l'ordre du serveur) ;
// 2. sinon le premier module disponible de l'univers de l'objectif ;
// 3. sinon le premier module disponible du premier univers qui a des leçons ;
// 4. sinon (pas d'univers) le premier module non terminé.
// null : tout est terminé.
export function pickLessonOfDay({
  modules,
  universes,
  log,
  lastModuleId,
  objectiveSlug,
}: {
  modules: readonly Module[];
  universes: readonly Universe[];
  log: readonly LessonLogEntry[];
  lastModuleId: number | null;
  objectiveSlug: string | null;
}): LessonOfDay | null {
  const playable = modules.filter((m) => totalCount(m) > 0);
  const pack = (module: Module): LessonOfDay | null => {
    const lesson = currentLesson(module);
    return lesson ? { module, lesson, universe: universeOf(module, universes) } : null;
  };

  // 1. Module en cours le plus récent
  const started = playable.filter((m) => moduleState(m) === 'started');
  if (started.length > 0) {
    const activity = lastActivityByModule(log);
    const dated = started.filter((m) => activity.has(m.id));
    const recent = dated.sort((a, b) => ((activity.get(b.id) ?? '') > (activity.get(a.id) ?? '') ? 1 : -1))[0];
    const chosen = recent ?? started.find((m) => m.id === lastModuleId) ?? started[0];
    const found = pack(chosen);
    if (found) return found;
  }

  const sorted = [...universes].sort((a, b) => a.position - b.position || a.id - b.id);
  const firstAvailable = (u: Universe) => availableModules(universeEntry(u, [...modules]).modules)[0] ?? null;

  // 2. Univers de l'objectif
  const objective = objectiveSlug ? sorted.find((u) => u.slug === objectiveSlug) : undefined;
  if (objective) {
    const m = firstAvailable(objective);
    if (m) return pack(m);
  }

  // 3. Premier univers qui a des leçons à faire
  for (const u of sorted) {
    const m = firstAvailable(u);
    if (m) return pack(m);
  }

  // 4. Sans univers : ordre du serveur
  if (sorted.length === 0) {
    const m = playable.find((x) => moduleState(x) !== 'done');
    if (m) return pack(m);
  }
  return null;
}

// ---------------------------------------------------------------------------
// États du programme du jour
// ---------------------------------------------------------------------------

export type ProgramState = {
  lessonDone: boolean;
  revisionDone: boolean;
  // Compteur « <n> sur <total> » de la bulle : 2 (leçon et révision), ou 1
  // quand il n'y a plus de leçon disponible (la révision seule)
  count: number;
  total: 1 | 2;
  // Journée faite (célébration)
  dayDone: boolean;
  line: string;
  mood: ValMood;
};

// lessonAvailable : il reste une leçon à faire (sinon « Tu es à jour »). Une
// leçon déjà faite aujourd'hui compte toujours, même si c'était la dernière.
export function programState(lessonDone: boolean, revisionDone: boolean, lessonAvailable = true): ProgramState {
  if (!lessonAvailable && !lessonDone) {
    return revisionDone
      ? { lessonDone, revisionDone, count: 1, total: 1, dayDone: true, line: 'Révision faite, à demain !', mood: 'celebrant' }
      : { lessonDone, revisionDone, count: 0, total: 1, dayDone: false, line: 'Tu es à jour ! Une petite révision ?', mood: 'complice' };
  }
  const count = (lessonDone ? 1 : 0) + (revisionDone ? 1 : 0);
  const base = { lessonDone, revisionDone, count, total: 2 as const, dayDone: lessonDone && revisionDone };
  if (lessonDone && revisionDone) return { ...base, line: 'Journée terminée. À demain !', mood: 'celebrant' };
  if (lessonDone) return { ...base, line: 'Bien joué ! Plus que la révision.', mood: 'fier' };
  if (revisionDone) return { ...base, line: 'Révision faite. Plus que la leçon !', mood: 'fier' };
  return { ...base, line: 'Une leçon, une révision, et ta journée est faite.', mood: 'complice' };
}

// « 1 sur 2 », « 0 sur 1 » (espaces insécables : jamais coupé en fin de bulle)
export function programCounter(count: number, total: number = 2): string {
  return `${count}\u00A0sur\u00A0${total}`;
}

// ---------------------------------------------------------------------------
// Révision : durée estimée
// ---------------------------------------------------------------------------

export const SECONDS_PER_SCREEN = 25;

export function revisionMinutes(screens: number): number {
  if (screens <= 0) return 0;
  return Math.max(1, Math.ceil((screens * SECONDS_PER_SCREEN) / 60));
}

// « 6 écrans · environ 3 min » (espaces insécables : « 3 min » jamais coupé)
export function revisionLabel(screens: number): string {
  return `${screens}${NBSP}${screens >= 2 ? 'écrans' : 'écran'} · environ${NBSP}${revisionMinutes(screens)}${NBSP}min`;
}

// ---------------------------------------------------------------------------
// Carrousel « TES UNIVERS »
// ---------------------------------------------------------------------------

// L'univers de l'objectif en premier, puis ceux en cours (du plus récent au
// plus ancien, date connue sur le téléphone ; sans date, après, dans l'ordre
// du serveur), puis les autres dans l'ordre du serveur
export function carouselOrder(
  entries: readonly UniverseEntry[],
  objectiveSlug: string | null,
  log: readonly LessonLogEntry[]
): UniverseEntry[] {
  const activity = lastActivityByModule(log);
  const lastOf = (e: UniverseEntry) =>
    e.modules.reduce<string | null>((best, m) => {
      const at = activity.get(m.id) ?? null;
      return at && (!best || at > best) ? at : best;
    }, null);
  const objective = entries.find((e) => e.universe.slug === objectiveSlug) ?? null;
  const rest = entries.filter((e) => e !== objective);
  const started = rest
    .map((e, i) => ({ e, i, at: lastOf(e) }))
    .filter((x) => x.e.progress > 0 && x.e.progress < 1)
    .sort((a, b) => {
      if (a.at && b.at) return a.at < b.at ? 1 : a.at > b.at ? -1 : a.i - b.i;
      if (a.at) return -1;
      if (b.at) return 1;
      return a.i - b.i;
    })
    .map((x) => x.e);
  const others = rest.filter((e) => !started.includes(e));
  return [...(objective ? [objective] : []), ...started, ...others];
}
