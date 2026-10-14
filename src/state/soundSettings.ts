import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

import { parseSoundSetting, SOUND_SETTING_OFF } from '@/src/utils/soundRules';

// Réglage « Sons » (profil), mémorisé sur le téléphone : il vaut avec ou
// sans compte. Activé par défaut. Tout échec de stockage est ignoré.
const KEY = 'valtheria:sons';

let enabled = true;
let loaded = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export const soundSettings = {
  isEnabled: () => enabled,
  async load(): Promise<boolean> {
    if (loaded) return enabled;
    try {
      enabled = parseSoundSetting(await AsyncStorage.getItem(KEY));
    } catch {
      enabled = true;
    }
    loaded = true;
    emit();
    return enabled;
  },
  async set(next: boolean): Promise<void> {
    enabled = next;
    loaded = true;
    emit();
    try {
      await AsyncStorage.setItem(KEY, next ? 'on' : SOUND_SETTING_OFF);
    } catch {
      // stockage indisponible : le réglage vaut pour cette session
    }
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

export function useSoundEnabled(): boolean {
  return useSyncExternalStore(soundSettings.subscribe, soundSettings.isEnabled, soundSettings.isEnabled);
}
