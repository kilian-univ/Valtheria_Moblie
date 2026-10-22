// Toucher caché : un geste répété N fois de suite, sans pause trop longue
// entre deux touchers (test de Sentry dans les Réglages : 7 touchers sur le
// numéro de version). Fonction pure, sans React : testable avec Node.

export const SECRET_TAPS = 7;
// Pause au-delà de laquelle le compte repart de zéro
export const SECRET_TAP_GAP_MS = 1500;

export type SecretTapState = { count: number; at: number | null };

export const SECRET_TAP_START: SecretTapState = { count: 0, at: null };

// Un toucher de plus : le nouvel état, et `fire` au N-ième toucher de suite
// (le compte repart alors de zéro)
export function secretTap(
  state: SecretTapState,
  now: number,
  needed: number = SECRET_TAPS,
  gap: number = SECRET_TAP_GAP_MS
): { state: SecretTapState; fire: boolean } {
  const count = state.at !== null && now - state.at <= gap ? state.count + 1 : 1;
  if (count >= needed) return { state: SECRET_TAP_START, fire: true };
  return { state: { count, at: now }, fire: false };
}
