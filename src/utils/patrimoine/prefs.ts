// Préférences du suivi de patrimoine gardées sur le téléphone, par compte :
// mode discret, versements sur les livrets, épargne de précaution, objectifs,
// étapes, mois de versement, relevés anormaux masqués, icônes choisies. Lecture prudente. Sans React : testable avec Node.

import { isIconKey, type IconKey } from './assetIcons';
import { clampMonths, EMERGENCY_MONTHS, type Emergency, type Goal } from './goals';
import { MILESTONES, type Earned } from './milestones';

// Versement sur un livret (date ISO, montant) : il compte pour la régularité
export type LivretDeposit = { at: string; amount: number; positionId: number | null };

export type PatrimoinePrefs = {
  // Mode discret : tous les montants masqués par des points
  discreet: boolean;
  livretDeposits: LivretDeposit[];
  emergency: Emergency;
  goals: Goal[];
  milestones: Earned;
  // Mois avec au moins un versement (« 2026-10 »), relevés au dernier passage
  // sur Mon patrimoine ; lus par le profil
  months: string[];
  // Courbes : relevés anormaux masqués (activé par défaut)
  hideAnomalies: boolean;
  // Icône choisie pour un placement sans cours, par symbole (en majuscules)
  icons: Record<string, IconKey>;
  // Objectifs de l'ancien outil Épargne du site déjà repris (une seule fois)
  savingsImported: boolean;
};

export const DEFAULT_PREFS: PatrimoinePrefs = {
  discreet: false,
  livretDeposits: [],
  emergency: { monthlyExpenses: null, months: EMERGENCY_MONTHS.default },
  goals: [],
  milestones: {},
  months: [],
  hideAnomalies: true,
  icons: {},
  savingsImported: false,
};

const DEPOSITS_KEPT = 400;
export const GOALS_MAX = 20;
const LINKS_MAX = 100;
const ICONS_MAX = 200;

const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const str = (v: unknown): string | null => (typeof v === 'string' && v !== '' ? v : null);

// Clés d'anciennes options, retirées depuis : effacées des préférences gardées
// (logScale : échelle logarithmique des courbes, retirée le 19/10/2026)
export const RETIRED_PREF_KEYS: readonly string[] = ['logScale'];

export function hasRetiredKeys(raw: unknown): boolean {
  return !!raw && typeof raw === 'object' && RETIRED_PREF_KEYS.some((k) => k in (raw as Record<string, unknown>));
}

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
  const e = obj(r.emergency);
  const expenses = typeof e.monthlyExpenses === 'number' && e.monthlyExpenses > 0 ? e.monthlyExpenses : null;
  const goals = (Array.isArray(r.goals) ? r.goals : [])
    .map((x) => {
      const g = obj(x);
      const id = str(g.id);
      const name = str(g.name);
      return id && name && typeof g.amount === 'number' && g.amount > 0
        ? {
            id,
            name,
            amount: g.amount,
            date: str(g.date),
            createdAt: str(g.createdAt) ?? new Date(0).toISOString(),
            reachedAt: str(g.reachedAt),
            positionIds: Array.isArray(g.positionIds) ? [...new Set(g.positionIds.filter((x): x is number => Number.isInteger(x)))].slice(0, LINKS_MAX) : null,
          }
        : null;
    })
    .filter((g): g is Goal => g !== null)
    .slice(0, GOALS_MAX);
  const m = obj(r.milestones);
  const milestones: Earned = {};
  for (const { key } of MILESTONES) {
    const at = str(m[key]);
    if (at) milestones[key] = at;
  }
  const months = (Array.isArray(r.months) ? r.months : []).filter((x): x is string => typeof x === 'string' && /^\d{4}-\d{2}$/.test(x));
  const icons: Record<string, IconKey> = {};
  for (const [ticker, key] of Object.entries(obj(r.icons)).slice(0, ICONS_MAX)) {
    if (ticker && isIconKey(key)) icons[ticker.toUpperCase()] = key;
  }
  return {
    discreet: r.discreet === true,
    livretDeposits: deposits.slice(-DEPOSITS_KEPT),
    emergency: { monthlyExpenses: expenses, months: clampMonths(typeof e.months === 'number' ? e.months : EMERGENCY_MONTHS.default) },
    goals,
    milestones,
    months: [...new Set(months)].sort(),
    hideAnomalies: r.hideAnomalies !== false,
    icons,
    savingsImported: r.savingsImported === true,
  };
}

export function addLivretDeposit(prefs: PatrimoinePrefs, deposit: LivretDeposit): PatrimoinePrefs {
  if (!(deposit.amount > 0)) return prefs;
  return { ...prefs, livretDeposits: [...prefs.livretDeposits, deposit].slice(-DEPOSITS_KEPT) };
}

// Icône choisie pour un placement (null : reconnaissance automatique)
export function setIcon(prefs: PatrimoinePrefs, ticker: string, icon: IconKey | null): PatrimoinePrefs {
  const icons = { ...prefs.icons };
  if (icon) icons[ticker.toUpperCase()] = icon;
  else delete icons[ticker.toUpperCase()];
  return { ...prefs, icons };
}
