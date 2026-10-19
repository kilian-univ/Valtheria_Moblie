import { mergeDiscovered } from '@/src/utils/discoveredWords';
import { createUserListStore } from './userMemory';

// Mots découverts du Dictionnaire, par utilisateur (et sans compte) : la
// première ouverture de chaque fiche (utils/discoveredWords.ts)

export const discoveredWordsStore = createUserListStore<string>({
  prefix: 'valtheria:mots-decouverts',
  valid: (item): item is string => typeof item === 'string',
  merge: mergeDiscovered,
});
