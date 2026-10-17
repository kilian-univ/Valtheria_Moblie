import AsyncStorage from '@react-native-async-storage/async-storage';

import { appendLoggedError, errorEntry, parseErrorLog, type LoggedError } from '@/src/utils/errorLog';

// Journal des erreurs d'affichage : chaque erreur part dans le journal de
// l'appareil (console.error : terminal d'Expo, et Console.app sur iPhone),
// et les dernières sont gardées sur le téléphone pour un diagnostic. Jamais
// d'envoi vers un serveur.

const KEY = 'valtheria:journal-erreurs';

// Écritures en file : deux erreurs simultanées ne s'écrasent pas
let queue: Promise<void> = Promise.resolve();

export function logError(where: string, error: unknown) {
  const entry = errorEntry(where, error);
  console.error(`ERREUR D'AFFICHAGE (${where}) :`, entry.message, entry.stack ? `\n${entry.stack}` : '');
  queue = queue
    .then(async () => {
      const list = parseErrorLog(await AsyncStorage.getItem(KEY));
      await AsyncStorage.setItem(KEY, JSON.stringify(appendLoggedError(list, entry)));
    })
    .catch(() => {
      // stockage indisponible : l'erreur reste dans le journal de l'appareil
    });
}

export async function readErrorLog(): Promise<LoggedError[]> {
  try {
    return parseErrorLog(await AsyncStorage.getItem(KEY));
  } catch {
    return [];
  }
}
