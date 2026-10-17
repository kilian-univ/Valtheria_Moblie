import AsyncStorage from '@react-native-async-storage/async-storage';

import { keysToPurge } from '@/src/utils/purge';
import { onboardingStore } from './onboarding';
import { clearPatrimoine } from './patrimoineData';
import { resetReminder } from './reminder';

// Compte supprimé : plus rien de la personne sur le téléphone (versements,
// objectifs, carnet, prénom…), et plus aucun rappel programmé
export async function purgeAccountData(userId: number | string): Promise<void> {
  await resetReminder();
  clearPatrimoine();
  onboardingStore.reset();
  try {
    const keys = await AsyncStorage.getAllKeys();
    await AsyncStorage.multiRemove(keysToPurge(keys, userId));
  } catch {
    // stockage indisponible : les clés restent, sans accès au compte supprimé
  }
}
