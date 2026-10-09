import AsyncStorage from '@react-native-async-storage/async-storage';

import { pushRecent, RECENTS_MAX } from '@/src/utils/dictionary';

// Mots récemment consultés, par utilisateur (deux comptes sur le même
// téléphone ne se mélangent pas). Tout échec de stockage est ignoré : la
// section « Récemment consultés » reste alors masquée.

const recentsKey = (userId: number) => `valtheria:dictionnaire:recents:${userId}`;

export async function getRecentTerms(userId: number): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(recentsKey(userId));
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((t): t is string => typeof t === 'string').slice(0, RECENTS_MAX) : [];
  } catch {
    return [];
  }
}

export async function addRecentTerm(userId: number, term: string): Promise<void> {
  try {
    const current = await getRecentTerms(userId);
    await AsyncStorage.setItem(recentsKey(userId), JSON.stringify(pushRecent(current, term)));
  } catch {
    // stockage indisponible : sans conséquence
  }
}
