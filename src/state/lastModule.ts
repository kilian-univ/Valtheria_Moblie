import AsyncStorage from '@react-native-async-storage/async-storage';

// Mémoire locale de l'onglet Apprendre, par utilisateur (deux comptes sur le
// même téléphone ne se mélangent pas). Tout échec de stockage est ignoré :
// l'écran retombe alors sur l'ordre du serveur.

const lastModuleKey = (userId: number) => `valtheria:apprendre:lastModuleId:${userId}`;
const celebratedKey = (userId: number) => `valtheria:apprendre:celebratedModules:${userId}`;

export async function getLastModuleId(userId: number): Promise<number | null> {
  try {
    const raw = await AsyncStorage.getItem(lastModuleKey(userId));
    const id = raw === null ? NaN : Number(raw);
    return Number.isFinite(id) ? id : null;
  } catch {
    return null;
  }
}

export async function setLastModuleId(userId: number, moduleId: number): Promise<void> {
  try {
    await AsyncStorage.setItem(lastModuleKey(userId), String(moduleId));
  } catch {
    // stockage indisponible : sans conséquence
  }
}

// Modules dont la fin a déjà été fêtée sur l'accueil (une seule fois chacun)
export async function getCelebratedModuleIds(userId: number): Promise<number[]> {
  try {
    const raw = await AsyncStorage.getItem(celebratedKey(userId));
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((v): v is number => typeof v === 'number') : [];
  } catch {
    return [];
  }
}

export async function addCelebratedModuleId(userId: number, moduleId: number): Promise<void> {
  try {
    const current = await getCelebratedModuleIds(userId);
    if (current.includes(moduleId)) return;
    await AsyncStorage.setItem(celebratedKey(userId), JSON.stringify([...current, moduleId]));
  } catch {
    // stockage indisponible : la fête pourra se rejouer, sans conséquence
  }
}
