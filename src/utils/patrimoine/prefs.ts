// Préférences du suivi de patrimoine gardées sur le téléphone, par compte.
// Lecture prudente. Sans React : testable avec Node.

export type PatrimoinePrefs = {
  // Mode discret : tous les montants masqués par des points
  discreet: boolean;
};

export const DEFAULT_PREFS: PatrimoinePrefs = { discreet: false };

export function parsePrefs(raw: unknown): PatrimoinePrefs {
  const r = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  return { discreet: r.discreet === true };
}
