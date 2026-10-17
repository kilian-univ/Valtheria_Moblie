// Contenu d'apprentissage gardé entre deux lancements (décision du 17
// octobre 2026) : modules, univers, série, XP, Vals ; jamais un montant du
// patrimoine. Relu au lancement suivant, hors ligne compris, jusqu'à ce que
// le serveur réponde. Fonctions pures, testables avec Node.

// Au-delà, la copie est trop ancienne pour être montrée
export const LEARNING_CACHE_MAX_DAYS = 30;
const DAY_MS = 86_400_000;

export type LearningSnapshot = {
  userId: number;
  savedAt: string;
  modules: unknown[];
  universes: unknown[];
  streak: number;
  xp: number;
  level: number;
  vals: number;
};

const num = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);

// Copie relue : seulement celle du même compte, bien formée et récente
export function parseLearningCache(raw: string | null, userId: number | null, now = new Date()): LearningSnapshot | null {
  if (!raw || userId === null) return null;
  try {
    const p: unknown = JSON.parse(raw);
    if (!p || typeof p !== 'object') return null;
    const r = p as Record<string, unknown>;
    if (r.userId !== userId || !Array.isArray(r.modules) || typeof r.savedAt !== 'string') return null;
    const age = now.getTime() - Date.parse(r.savedAt);
    if (!Number.isFinite(age) || age > LEARNING_CACHE_MAX_DAYS * DAY_MS) return null;
    return {
      userId,
      savedAt: r.savedAt,
      modules: r.modules,
      universes: Array.isArray(r.universes) ? r.universes : [],
      streak: num(r.streak, 0),
      xp: num(r.xp, 0),
      level: num(r.level, 1),
      vals: num(r.vals, 0),
    };
  } catch {
    return null;
  }
}

// Liste de mots gardée : relue telle quelle si elle est bien formée
export function parseWordsCache(raw: string | null): unknown[] | null {
  if (!raw) return null;
  try {
    const p: unknown = JSON.parse(raw);
    return Array.isArray(p) && p.length > 0 ? p : null;
  } catch {
    return null;
  }
}
