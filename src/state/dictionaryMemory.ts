import AsyncStorage from '@react-native-async-storage/async-storage';
import { serialQueue } from '@/src/utils/serialQueue';

import { pushRecent, RECENTS_MAX, toggleFavorite } from '@/src/utils/dictionary';

// Mémoire locale du Dictionnaire, par utilisateur (deux comptes sur le même
// téléphone ne se mélangent pas) : mots récemment consultés et « Mes mots ».
// Tout échec de stockage est ignoré : la section concernée reste masquée.

const recentsKey = (userId: number) => `valtheria:dictionnaire:recents:${userId}`;
const favoritesKey = (userId: number) => `valtheria:dictionnaire:mesMots:${userId}`;

async function readTerms(key: string): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(key);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((t): t is string => typeof t === 'string') : [];
  } catch {
    return [];
  }
}

async function writeTerms(key: string, terms: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(terms));
  } catch {
    // stockage indisponible : sans conséquence
  }
}

export async function getRecentTerms(userId: number): Promise<string[]> {
  return (await readTerms(recentsKey(userId))).slice(0, RECENTS_MAX);
}

// Écritures à la suite : deux changements rapprochés ne s'écrasent pas
const inOrder = serialQueue();

export function addRecentTerm(userId: number, term: string): Promise<void> {
  return inOrder(async () => writeTerms(recentsKey(userId), pushRecent(await getRecentTerms(userId), term)));
}

export async function getFavoriteTerms(userId: number): Promise<string[]> {
  return readTerms(favoritesKey(userId));
}

// Ajoute le mot à « Mes mots », ou l'en retire ; renvoie la nouvelle liste
export function toggleFavoriteTerm(userId: number, term: string): Promise<string[]> {
  return inOrder(async () => {
    const next = toggleFavorite(await getFavoriteTerms(userId), term);
    await writeTerms(favoritesKey(userId), next);
    return next;
  });
}
