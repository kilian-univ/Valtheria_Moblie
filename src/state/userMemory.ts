import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useSyncExternalStore } from 'react';

// Mémoire locale d'une liste, par utilisateur (deux comptes sur le même
// téléphone ne se mélangent pas) et sans compte (« invite »). À la première
// lecture d'un compte, la liste gardée sans compte y est reprise (leçon
// découverte jouée avant l'inscription). Tout échec de stockage est ignoré.

export type UserKey = string;
export const GUEST: UserKey = 'invite';

export function userKeyOf(userId: number | string | null | undefined): UserKey {
  return userId === null || userId === undefined ? GUEST : String(userId);
}

export type UserListStore<T> = {
  load(key: UserKey): Promise<T[]>;
  get(key: UserKey): T[] | null;
  update(key: UserKey, change: (list: T[]) => T[]): Promise<void>;
  subscribe(listener: () => void): () => void;
};

export function createUserListStore<T>({
  prefix,
  valid,
  merge,
}: {
  prefix: string;
  valid: (item: unknown) => item is T;
  merge: (base: T[], extra: T[]) => T[];
}): UserListStore<T> {
  const cache = new Map<UserKey, T[]>();
  const pending = new Map<UserKey, Promise<T[]>>();
  const listeners = new Set<() => void>();
  const storageKey = (key: UserKey) => `${prefix}:${key}`;
  const emit = () => listeners.forEach((l) => l());

  async function read(key: UserKey): Promise<T[] | null> {
    try {
      const raw = await AsyncStorage.getItem(storageKey(key));
      if (raw === null) return null;
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter(valid) : [];
    } catch {
      return null;
    }
  }

  async function write(key: UserKey, list: T[]): Promise<void> {
    try {
      await AsyncStorage.setItem(storageKey(key), JSON.stringify(list));
    } catch {
      // stockage indisponible : sans conséquence
    }
  }

  const store: UserListStore<T> = {
    get: (key) => cache.get(key) ?? null,
    load(key) {
      const known = cache.get(key);
      if (known) return Promise.resolve(known);
      const running = pending.get(key);
      if (running) return running;
      const job = (async () => {
        let list = await read(key);
        // Premier passage d'un compte : la liste sans compte est reprise
        if (list === null && key !== GUEST) {
          const guest = (await read(GUEST)) ?? [];
          list = merge([], guest);
          if (list.length > 0) await write(key, list);
        }
        const out = list ?? [];
        cache.set(key, out);
        pending.delete(key);
        emit();
        return out;
      })();
      pending.set(key, job);
      return job;
    },
    async update(key, change) {
      const current = await store.load(key);
      const next = change(current);
      if (next === current) return;
      cache.set(key, next);
      emit();
      await write(key, next);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
  return store;
}

// Lecture dans un écran : null tant que la mémoire n'est pas lue
export function useUserList<T>(store: UserListStore<T>, key: UserKey): T[] | null {
  const list = useSyncExternalStore(store.subscribe, () => store.get(key));
  useEffect(() => {
    store.load(key);
  }, [store, key]);
  return list;
}
