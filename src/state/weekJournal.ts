import { addJournalEntry, type JournalEntry, journalEntry } from '@/src/utils/weekJournal';
import { createUserListStore, type UserKey, useUserList } from './userMemory';

// Journal des leçons terminées (date, XP gagnés), par utilisateur (et sans
// compte, repris à la première ouverture d'un compte) : graphique « CETTE
// SEMAINE » du profil

function isEntry(item: unknown): item is JournalEntry {
  const e = item as JournalEntry;
  return !!e && typeof e.day === 'string' && typeof e.at === 'string' && typeof e.xp === 'number';
}

export const weekJournalStore = createUserListStore<JournalEntry>({
  prefix: 'valtheria:journal',
  valid: isEntry,
  merge: (base, extra) => [...base, ...extra].sort((a, b) => (a.at < b.at ? -1 : 1)),
});

export function recordLessonXp(key: UserKey, xp: number, now: Date = new Date()): Promise<void> {
  return weekJournalStore.update(key, (list) => addJournalEntry(list, journalEntry(now, xp)));
}

export function useWeekJournal(key: UserKey): JournalEntry[] | null {
  return useUserList(weekJournalStore, key);
}
