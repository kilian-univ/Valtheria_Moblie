// Journal des erreurs d'affichage rattrapées : forme des entrées et liste
// bornée. Fonctions pures, sans React : testables avec Node. L'écriture sur
// le téléphone est dans src/state/errorLog.ts.

// Assez pour comprendre une série de plantages, sans grossir la mémoire
export const ERROR_LOG_SIZE = 20;
const STACK_MAX = 1500;

export type LoggedError = { at: string; where: string; message: string; stack: string | null };

export function errorEntry(where: string, error: unknown, now = new Date()): LoggedError {
  const isError = error instanceof Error;
  const message = isError ? error.message || error.name : String(error);
  const stack = isError && error.stack ? error.stack.slice(0, STACK_MAX) : null;
  return { at: now.toISOString(), where, message, stack };
}

// Entrée de journal, la plus récente en tête, liste bornée
export function appendLoggedError(list: readonly LoggedError[], entry: LoggedError, size = ERROR_LOG_SIZE): LoggedError[] {
  return [entry, ...list].slice(0, size);
}

// Journal relu sur le téléphone : illisible ou mal formé, il repart vide
export function parseErrorLog(raw: string | null): LoggedError[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((e): e is LoggedError => !!e && typeof e === 'object' && typeof (e as LoggedError).message === 'string')
      : [];
  } catch {
    return [];
  }
}
