import type { LessonLogEntry } from '@/src/utils/dailyProgram';
import { localDay } from '@/src/utils/day';
import { createUserListStore, type UserKey, useUserList } from './userMemory';

// Leçons terminées sur ce téléphone (leçon, module, instant), par compte : le
// serveur ne renvoie aucune date (docs/lot-serveur.md, 4.6). Sert à la leçon
// du jour (module en cours le plus récent), à l'ordre des univers et au
// programme du jour.

export const LOG_MAX = 500;

function isEntry(item: unknown): item is LessonLogEntry {
  const e = item as LessonLogEntry;
  return !!e && typeof e.lessonId === 'number' && typeof e.moduleId === 'number' && typeof e.at === 'string' && typeof e.day === 'string';
}

export const learningLogStore = createUserListStore<LessonLogEntry>({
  prefix: 'valtheria:apprendre:lecons',
  valid: isEntry,
  merge: (base, extra) => [...base, ...extra].sort((a, b) => (a.at < b.at ? -1 : 1)).slice(-LOG_MAX),
});

export function recordLessonDone(key: UserKey, lessonId: number, moduleId: number, now: Date = new Date()): Promise<void> {
  const entry: LessonLogEntry = { lessonId, moduleId, at: now.toISOString(), day: localDay(now) };
  return learningLogStore.update(key, (list) => [...list, entry].slice(-LOG_MAX));
}

export function useLearningLog(key: UserKey): LessonLogEntry[] | null {
  return useUserList(learningLogStore, key);
}
