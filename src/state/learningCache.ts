import AsyncStorage from '@react-native-async-storage/async-storage';

import type { DictionaryEntry } from '@/src/utils/dictionary';
import { parseLearningCache, parseWordsCache } from '@/src/utils/learningCache';
import { getLastProfile } from './lastProfile';
import { learningStore } from './learningStore';

// Copies sur le téléphone du contenu d'apprentissage (voir utils/learningCache).
// Effacées à la déconnexion et à la suppression du compte (utils/purge).
export const LEARNING_CACHE_KEY = 'valtheria:apprendre:cache';
export const WORDS_CACHE_KEY = 'valtheria:dictionnaire:cache';

// Compte courant, ou le dernier connu (profil pas encore arrivé, hors ligne)
async function accountId(userId: number | null | undefined): Promise<number | null> {
  if (typeof userId === 'number') return userId;
  return (await getLastProfile())?.userId ?? null;
}

// Au lancement : les derniers modules connus, si rien n'est encore chargé
export async function restoreLearning(userId: number | null | undefined): Promise<void> {
  if (learningStore.getState().loaded) return;
  try {
    const snap = parseLearningCache(await AsyncStorage.getItem(LEARNING_CACHE_KEY), await accountId(userId));
    if (!snap || learningStore.getState().loaded) return;
    learningStore.setState({
      modules: snap.modules as never,
      universes: snap.universes as never,
      streak: snap.streak,
      xp: snap.xp,
      level: snap.level,
      vals: snap.vals,
      loaded: true,
    });
  } catch {
    // copie illisible : on attend le serveur
  }
}

// Après chaque chargement réussi
export async function saveLearning(userId: number | null | undefined): Promise<void> {
  const s = learningStore.getState();
  const id = await accountId(userId);
  if (!s.loaded || id === null) return;
  const snap = { userId: id, savedAt: new Date().toISOString(), modules: s.modules, universes: s.universes, streak: s.streak, xp: s.xp, level: s.level, vals: s.vals };
  AsyncStorage.setItem(LEARNING_CACHE_KEY, JSON.stringify(snap)).catch(() => {});
}

export async function restoreWords(): Promise<DictionaryEntry[] | null> {
  try {
    return parseWordsCache(await AsyncStorage.getItem(WORDS_CACHE_KEY)) as DictionaryEntry[] | null;
  } catch {
    return null;
  }
}

export function saveWords(entries: DictionaryEntry[]): void {
  if (entries.length > 0) AsyncStorage.setItem(WORDS_CACHE_KEY, JSON.stringify(entries)).catch(() => {});
}
