import { type Declic, addDeclic, mergeDeclics } from '@/src/utils/notebook';
import { createUserListStore, type UserKey, useUserList } from './userMemory';

// Carnet de déclics, par utilisateur (et sans compte) : chaque phrase « À
// retenir » d'une leçon terminée, une seule fois (utils/notebook.ts)

function isDeclic(item: unknown): item is Declic {
  const d = item as Declic;
  return !!d && typeof d.text === 'string' && typeof d.at === 'string';
}

export const notebookStore = createUserListStore<Declic>({
  prefix: 'valtheria:carnet',
  valid: isDeclic,
  merge: mergeDeclics,
});

export function addToNotebook(key: UserKey, entry: Declic): Promise<void> {
  return notebookStore.update(key, (list) => {
    const next = addDeclic(list, entry);
    return next.length === list.length ? list : next;
  });
}

export function useNotebook(key: UserKey): Declic[] | null {
  return useUserList(notebookStore, key);
}
