import AsyncStorage from '@react-native-async-storage/async-storage';

import type { UserKey } from './userMemory';

// Journée faite (leçon et révision) déjà fêtée : une seule fois par jour et
// par compte, sur la fin de la révision ou à l'accueil
const key = (user: UserKey) => `valtheria:journee-fetee:${user}`;

export async function dayCelebrated(user: UserKey, day: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(key(user))) === day;
  } catch {
    // stockage illisible : on ne fête pas deux fois au risque de ne pas fêter
    return true;
  }
}

export async function markDayCelebrated(user: UserKey, day: string): Promise<void> {
  try {
    await AsyncStorage.setItem(key(user), day);
  } catch {
    // stockage indisponible : sans conséquence
  }
}
