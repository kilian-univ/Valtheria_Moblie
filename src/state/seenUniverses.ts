import { createUserListStore, type UserKey, useUserList } from './userMemory';

// Univers déjà visités, par compte : Val ne les présente qu'à la première
// visite

export const seenUniversesStore = createUserListStore<string>({
  prefix: 'valtheria:univers-vus',
  valid: (item: unknown): item is string => typeof item === 'string',
  merge: (base, extra) => [...new Set([...base, ...extra])],
});

export function markUniverseSeen(key: UserKey, slug: string): Promise<void> {
  return seenUniversesStore.update(key, (list) => (list.includes(slug) ? list : [...list, slug]));
}

export function useSeenUniverses(key: UserKey): string[] | null {
  return useUserList(seenUniversesStore, key);
}
