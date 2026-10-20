// Série d'un compte connecté : ce que le serveur renvoie depuis le 20 octobre
// 2026 (gels en réserve, record, gel utilisé hier) et ce que l'app lui envoie
// à la première connexion (gels et record gardés sur le téléphone). Fonctions
// pures, sans React : testables avec Node. Un serveur plus ancien ne renvoie
// rien : les champs restent inconnus (null) et l'app se comporte comme avant.

import { FREEZE_MAX, type StreakHistory } from './streakRewards';

export type StreakFields = {
  // Gels en réserve ; null : inconnu (serveur ancien, pas encore chargé)
  streakFreezes: number | null;
  // Record de série ; null : inconnu
  streakBest: number | null;
  // Un gel a sauvé la série hier
  streakFrozenYesterday: boolean;
};

export const UNKNOWN_STREAK_FIELDS: StreakFields = { streakFreezes: null, streakBest: null, streakFrozenYesterday: false };

function count(raw: unknown, max = Number.MAX_SAFE_INTEGER): number | null {
  return typeof raw === 'number' && Number.isFinite(raw) ? Math.max(0, Math.min(max, Math.floor(raw))) : null;
}

// Champs de série d'une réponse du serveur (profil, progression, fin de
// leçon, reprise) ; seuls ceux présents sont renvoyés
export function streakFieldsOf(payload: unknown): Partial<StreakFields> {
  if (!payload || typeof payload !== 'object') return {};
  const p = payload as Record<string, unknown>;
  const out: Partial<StreakFields> = {};
  const freezes = count(p.streak_freezes, FREEZE_MAX);
  if (freezes !== null) out.streakFreezes = freezes;
  const best = count(p.streak_best);
  if (best !== null) out.streakBest = best;
  if (typeof p.streak_frozen_yesterday === 'boolean') out.streakFrozenYesterday = p.streak_frozen_yesterday;
  return out;
}

// Meilleure série à afficher : la série en cours, le record du téléphone ou
// celui du serveur, le plus grand des trois
export function bestStreakOf(streak: number, ...others: readonly (number | null | undefined)[]): number {
  return Math.max(streak, ...others.map((v) => v ?? 0));
}

// Ce que l'app envoie une seule fois à POST /user/streak/reprise : le record
// gardé sur le téléphone (compte et parcours sans compte) et les gels que la
// série locale aurait donnés ; le serveur ne descend jamais sous ses valeurs
export function streakReprisePayload(localBest: number, history: StreakHistory): { best: number; freezes: number } {
  return {
    best: Math.max(0, Math.floor(Math.max(localBest, history.best, history.streak))),
    freezes: Math.max(0, Math.min(FREEZE_MAX, Math.floor(history.freezes))),
  };
}
