// Branche le renouvellement transparent du jeton (src/auth/tokenRenewal.ts) sur
// le `fetch` global de l'app, avec le même stockage que le contexte API :
// trousseau du téléphone (expo-secure-store), AsyncStorage sur le web.
// À appeler une fois, au démarrage, avant le premier rendu (app/_layout.tsx).
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { API_BASE_URL } from '@/src/context/ApiContext';
import { captureError } from '@/src/monitoring';

import { createTokenRenewal, newDeviceId } from './tokenRenewal';

// Mêmes clé et options que ApiContext : le jeton renouvelé est celui relu au
// prochain lancement
const TOKEN_KEY = 'api_token';
const DEVICE_KEY = 'device_id';
const USE_KEYCHAIN = Platform.OS !== 'web';
const KEYCHAIN_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

async function writeToken(token: string): Promise<void> {
  if (!USE_KEYCHAIN) {
    await AsyncStorage.setItem(TOKEN_KEY, token);
    return;
  }
  await SecureStore.setItemAsync(TOKEN_KEY, token, KEYCHAIN_OPTIONS);
  await AsyncStorage.removeItem(TOKEN_KEY).catch(() => {});
}

async function deviceId(): Promise<string | null> {
  try {
    const existing = await AsyncStorage.getItem(DEVICE_KEY);
    if (existing) return existing;
    const id = newDeviceId();
    await AsyncStorage.setItem(DEVICE_KEY, id);
    return id;
  } catch {
    return null;
  }
}

let installed = false;

export function installTokenRenewal(): void {
  if (installed || typeof globalThis.fetch !== 'function') return;
  installed = true;
  const { fetch: wrapped } = createTokenRenewal({
    apiBaseUrl: API_BASE_URL,
    fetchImpl: globalThis.fetch.bind(globalThis),
    storage: { writeToken, deviceId },
    onError: (e) => captureError('tokenRenewal', e),
  });
  globalThis.fetch = wrapped;
}
