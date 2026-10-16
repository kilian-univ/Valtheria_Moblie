import { addDiscovered, mergeDiscovered } from '@/src/utils/discoveredWords';
import { createUserListStore, type UserKey, useUserList } from './userMemory';

// Mots découverts du Dictionnaire, par utilisateur (et sans compte) : la
// première ouverture de chaque fiche (utils/discoveredWords.ts)

export const discoveredWordsStore = createUserListStore<string>({
  prefix: 'valtheria:mots-decouverts',
  valid: (item): item is string => typeof item === 'string',
  merge: mergeDiscovered,
});

export function markDiscovered(key: UserKey, term: string): Promise<void> {
  return discoveredWordsStore.update(key, (list) => {
    const next = addDiscovered(list, term);
    return next.length === list.length ? list : next;
  });
}

export function useDiscoveredWords(key: UserKey): string[] | null {
  return useUserList(discoveredWordsStore, key);
}
