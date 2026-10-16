// Préférences du suivi de patrimoine gardées sur le téléphone, par compte.
// Lecture prudente. Sans React : testable avec Node.

// Versement sur un livret (date ISO, montant) : il compte pour la régularité
export type LivretDeposit = { at: string; amount: number; positionId: number | null };

export type PatrimoinePrefs = {
  // Mode discret : tous les montants masqués par des points
  discreet: boolean;
  livretDeposits: LivretDeposit[];
};

export const DEFAULT_PREFS: PatrimoinePrefs = { discreet: false, livretDeposits: [] };

const DEPOSITS_KEPT = 400;

const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {});

export function parsePrefs(raw: unknown): PatrimoinePrefs {
  const r = obj(raw);
  const deposits = (Array.isArray(r.livretDeposits) ? r.livretDeposits : [])
    .map((x) => {
      const d = obj(x);
      return typeof d.at === 'string' && typeof d.amount === 'number' && d.amount > 0
        ? { at: d.at, amount: d.amount, positionId: typeof d.positionId === 'number' ? d.positionId : null }
        : null;
    })
    .filter((d): d is LivretDeposit => d !== null);
  return { discreet: r.discreet === true, livretDeposits: deposits.slice(-DEPOSITS_KEPT) };
}

export function addLivretDeposit(prefs: PatrimoinePrefs, deposit: LivretDeposit): PatrimoinePrefs {
  if (!(deposit.amount > 0)) return prefs;
  return { ...prefs, livretDeposits: [...prefs.livretDeposits, deposit].slice(-DEPOSITS_KEPT) };
}
