import AsyncStorage from '@react-native-async-storage/async-storage';

// Dernier profil vu sur ce téléphone : le pseudo est rattaché à l'id de son
// utilisateur. Au démarrage, l'id n'est pas encore connu (le profil arrive par
// le réseau) : on lit donc la dernière paire, et l'arrivée du profil la
// remplace, même s'il s'agit d'un autre compte.

const KEY = 'valtheria:lastProfile';

export type LastProfile = { userId: number; pseudo: string };

export async function getLastProfile(): Promise<LastProfile | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (
      parsed &&
      typeof parsed === 'object' &&
      'userId' in parsed &&
      'pseudo' in parsed &&
      typeof parsed.userId === 'number' &&
      typeof parsed.pseudo === 'string' &&
      parsed.pseudo.trim() !== ''
    ) {
      return { userId: parsed.userId, pseudo: parsed.pseudo };
    }
    return null;
  } catch {
    return null;
  }
}

// Déconnexion, suppression du compte : le pseudo ne doit plus s'afficher
export async function clearLastProfile(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // stockage indisponible : sans conséquence
  }
}

export async function setLastProfile(profile: LastProfile): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(profile));
  } catch {
    // stockage indisponible : le pseudo s'affichera à l'arrivée du profil
  }
}
