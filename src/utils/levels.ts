// Niveaux de difficulté des modules d'un univers, sans React : testables
// avec Node.
//
// Le serveur porte le niveau sur chaque module (GET /modules → difficulty),
// parmi entree, debutant, inter, avance, expert (et l'ancienne valeur
// intermediaire, lue comme inter). Mêmes règles que la page web d'un thème
// (ThemeController du site) :
// - les niveaux suivent cet ordre ; un univers n'a que ceux de ses modules ;
// - un module sans niveau, dans un univers qui en a, compte comme inter ;
// - un niveau se débloque quand tous les modules des niveaux précédents sont
//   terminés (le premier est toujours ouvert).
// Aucun module n'a de niveau : un seul groupe « Tous les modules ».

import type { Module } from '@/src/context/ApiContext';
import { completedCount, moduleState, totalCount } from './learning';
import { LEVEL_ORDER, levelKey, levelLabel } from './levelNames';

export { LEVEL_ORDER, levelKey, levelLabel } from './levelNames';

function levelRank(key: string): number {
  const i = (LEVEL_ORDER as readonly string[]).indexOf(key);
  return i < 0 ? LEVEL_ORDER.length : i;
}

export type LevelGroup = {
  // null : univers sans niveaux (« Tous les modules »)
  key: string | null;
  label: string;
  // Dans l'ordre du serveur
  modules: Module[];
  done: number;
  unlocked: boolean;
  completed: boolean;
};

export const ALL_MODULES_LABEL = 'Tous les modules';

function isDone(module: Module): boolean {
  return moduleState(module) === 'done';
}

// Groupes de niveaux d'un univers, dans l'ordre, avec leur déblocage. Les
// modules sans leçon ne comptent pas (rien à y faire).
export function levelGroups(modules: readonly Module[]): LevelGroup[] {
  const playable = modules.filter((m) => totalCount(m) > 0);
  if (playable.length === 0) return [];
  const anyLevel = playable.some((m) => levelKey(m.difficulty) !== null);
  if (!anyLevel) {
    const done = playable.filter(isDone).length;
    return [
      { key: null, label: ALL_MODULES_LABEL, modules: playable, done, unlocked: true, completed: done === playable.length },
    ];
  }

  const keys: string[] = [];
  for (const m of playable) {
    const k = levelKey(m.difficulty) ?? 'inter';
    if (!keys.includes(k)) keys.push(k);
  }
  // Ordre du site ; les inconnus après, dans leur ordre d'apparition
  keys.sort((a, b) => levelRank(a) - levelRank(b));

  let previousDone = true;
  return keys.map((key) => {
    const own = playable.filter((m) => (levelKey(m.difficulty) ?? 'inter') === key);
    const done = own.filter(isDone).length;
    const group: LevelGroup = {
      key,
      label: levelLabel(key),
      modules: own,
      done,
      unlocked: previousDone,
      completed: done === own.length,
    };
    previousDone = previousDone && group.completed;
    return group;
  });
}

// Niveau ouvert à l'arrivée : le premier débloqué qui n'est pas terminé ;
// tout est terminé : le dernier
export function currentLevelIndex(groups: readonly LevelGroup[]): number {
  if (groups.length === 0) return 0;
  const i = groups.findIndex((g) => g.unlocked && !g.completed);
  return i < 0 ? groups.length - 1 : i;
}

// Toucher d'un niveau verrouillé : « Termine les 3 modules Débutant pour
// débloquer » (le premier niveau pas encore terminé avant lui)
export function lockedMessage(groups: readonly LevelGroup[], index: number): string | null {
  const target = groups[index];
  if (!target || target.unlocked) return null;
  const blocking = groups.slice(0, index).find((g) => !g.completed);
  if (!blocking) return null;
  const left = blocking.modules.length - blocking.done;
  return left >= 2
    ? `Termine les ${left} modules ${blocking.label} pour débloquer`
    : `Termine le module ${blocking.label} pour débloquer`;
}

// Modules d'un niveau, pour la liste : en cours d'abord (du plus récent au
// plus ancien quand la date est connue, sinon ordre du serveur), puis ceux
// pas commencés (ordre du serveur) ; les terminés à part
export function sortLevelModules(
  modules: readonly Module[],
  lastActivity: (moduleId: number) => string | null = () => null
): { active: Module[]; done: Module[] } {
  const started = modules.filter((m) => moduleState(m) === 'started');
  const recent = started
    .map((m, i) => ({ m, i, at: lastActivity(m.id) }))
    .sort((a, b) => {
      if (a.at && b.at) return a.at < b.at ? 1 : a.at > b.at ? -1 : a.i - b.i;
      if (a.at) return -1;
      if (b.at) return 1;
      return a.i - b.i;
    })
    .map((x) => x.m);
  return {
    active: [...recent, ...modules.filter((m) => moduleState(m) === 'new')],
    done: modules.filter(isDone),
  };
}

// « 3 modules · fais-les dans l'ordre que tu veux » (un seul : « 1 module dans ce niveau »)
export function levelIntro(count: number): string {
  return count >= 2 ? `${count} modules · fais-les dans l’ordre que tu veux` : `${count} module dans ce niveau`;
}

// « 2 modules terminés dans ce niveau »
export function doneModulesLabel(count: number, withLevels: boolean): string {
  const where = withLevels ? ' dans ce niveau' : '';
  return count >= 2 ? `${count} modules terminés${where}` : `${count} module terminé${where}`;
}

// Sous-titre d'une ligne de module : « 2 sur 5 leçons » ou « 5 leçons »
export function moduleLessonsLabel(module: Module): string {
  const total = totalCount(module);
  const done = completedCount(module);
  if (done > 0) return `${done} sur ${total} ${total >= 2 ? 'leçons' : 'leçon'}`;
  return `${total} ${total >= 2 ? 'leçons' : 'leçon'}`;
}

// Un module se commence-t-il ? Il a des leçons, n'est pas terminé, et son
// niveau est débloqué dans son univers.
export function availableModules(universeModules: readonly Module[]): Module[] {
  return levelGroups(universeModules)
    .filter((g) => g.unlocked)
    .flatMap((g) => g.modules.filter((m) => !isDone(m)));
}

// Niveau du module dans son univers (« INTERMÉDIAIRE »), null sans niveaux
export function moduleLevelLabel(module: Module, universeModules: readonly Module[]): string | null {
  const group = levelGroups(universeModules).find((g) => g.modules.some((m) => m.id === module.id));
  return group && group.key !== null ? group.label : null;
}

// Pastille d'un univers sur l'accueil : niveau atteint (le niveau en cours),
// « À découvrir » sans leçon terminée, « Terminé » à la fin
export type UniversePill = { label: string; level: string | null };

export function universePill(universeModules: readonly Module[]): UniversePill {
  const groups = levelGroups(universeModules);
  const started = universeModules.some((m) => completedCount(m) > 0);
  if (!started || groups.length === 0) return { label: 'À découvrir', level: null };
  if (groups.every((g) => g.completed)) return { label: 'Terminé', level: null };
  const current = groups[currentLevelIndex(groups)];
  return current.key === null ? { label: 'En cours', level: null } : { label: current.label, level: current.key };
}
