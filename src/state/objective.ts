import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useSyncExternalStore } from 'react';

import { type Objective, toObjective } from '@/src/lesson/discovery';
import type { UserKey } from './userMemory';

// Objectif choisi depuis le profil, gardé sur le téléphone par utilisateur
// (le serveur n'en accepte qu'une partie, voir serverObjective). Le dernier
// objectif connu sert aussi au texte du rappel quotidien.

const key = (user: UserKey) => `valtheria:objectif:${user}`;
const LAST = 'valtheria:objectif:dernier';

const cache = new Map<UserKey, Objective | null>();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

async function load(user: UserKey): Promise<void> {
  if (cache.has(user)) return;
  try {
    cache.set(user, toObjective(await AsyncStorage.getItem(key(user))));
  } catch {
    cache.set(user, null);
  }
  emit();
}

export async function setUserObjective(user: UserKey, objective: Objective): Promise<void> {
  cache.set(user, objective);
  emit();
  try {
    await AsyncStorage.multiSet([
      [key(user), objective],
      [LAST, objective],
    ]);
  } catch {
    // stockage indisponible : sans conséquence
  }
}

// Objectif connu ailleurs (serveur, première ouverture) : retenu pour le rappel
export function rememberObjective(objective: Objective | null): void {
  if (!objective) return;
  AsyncStorage.setItem(LAST, objective).catch(() => {});
}

export async function lastObjective(): Promise<Objective | null> {
  try {
    return toObjective(await AsyncStorage.getItem(LAST));
  } catch {
    return null;
  }
}

// Objectif choisi sur ce téléphone pour ce compte ; undefined tant que la
// mémoire n'est pas lue, null si aucun choix n'y est gardé
export function useStoredObjective(user: UserKey): Objective | null | undefined {
  const value = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
    () => (cache.has(user) ? (cache.get(user) ?? null) : undefined)
  );
  useEffect(() => {
    load(user);
  }, [user]);
  return value;
}
