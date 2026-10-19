import AsyncStorage from '@react-native-async-storage/async-storage';

import { keysToPurge, type PurgeOptions } from '@/src/utils/purge';
import { onboardingStore } from './onboarding';
import { clearBudget } from './budgetData';
import { clearBudgetPrefs } from './budgetPrefs';
import { clearPatrimoine } from './patrimoineData';
import { resetReminder } from './reminder';
import { resetWordLessonsCache } from './wordLessonsCache';

// Déconnexion ou compte supprimé : plus rien de la personne sur le téléphone
// (versements, objectifs, carnet, prénom…), plus aucun rappel programmé, et
// les caches en mémoire vidés (un autre compte ne voit pas ceux du précédent).
// À la déconnexion, le dernier profil (identifiant, pseudo) est gardé.
export async function purgeAccountData(userId: number | string, options: PurgeOptions = {}): Promise<void> {
  await resetReminder();
  clearPatrimoine();
  clearBudget();
  clearBudgetPrefs();
  onboardingStore.reset();
  resetWordLessonsCache();
  try {
    const keys = await AsyncStorage.getAllKeys();
    await AsyncStorage.multiRemove(keysToPurge(keys, userId, options));
  } catch {
    // stockage indisponible : les clés restent, sans accès au compte supprimé
  }
}
