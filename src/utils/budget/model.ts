// Réponse de GET /budget (site, lot du 18/10/2026), lue une fois à son
// arrivée : tout champ manquant ou mal formé a une valeur sûre, pour que
// l'écran ne plante jamais. Le serveur garde les données, l'app calcule.
// Fonctions pures, testables avec Node.

import { isDay, type Day } from './dates';

export type Family = 'besoins' | 'envies';
export type BudgetMode = 'essentiel' | 'detaille';
export type EntryType = 'revenu' | 'depense' | 'epargne';

export type BudgetCategory = {
  id: number;
  name: string;
  color: string;
  family: Family;
  // Plafond mensuel : la catégorie est une enveloppe ; null sinon
  envelopeCap: number | null;
};

// Récurrent : paie (revenu), charge fixe (depense), épargne prévue (epargne)
export type Recurring = {
  id: number;
  type: EntryType;
  category: string | null;
  label: string;
  amount: number;
  // Jour du mois (1 à 31) ; null pour un ancien récurrent sans jour
  day: number | null;
};

// Ponctuel (mode Détaillé) : dépense ou rentrée datée
export type Entry = {
  id: number;
  type: EntryType;
  category: string | null;
  label: string;
  amount: number;
  on: Day;
};

export type Balance = { amount: number; on: Day };

export type BudgetSettings = { mode: BudgetMode; setupDone: boolean; envelopeAlertPct: number };

export type LegacyItem = { type: EntryType; category: string | null; label: string; amount: number };

export type Budget = {
  today: Day | null;
  settings: BudgetSettings;
  categories: BudgetCategory[];
  recurring: Recurring[];
  entries: Entry[];
  balances: Balance[];
  reviews: { month: string; answer: string }[];
  legacy: LegacyItem[];
};

type AnyRecord = Record<string, unknown>;
const isRecord = (v: unknown): v is AnyRecord => !!v && typeof v === 'object' && !Array.isArray(v);
const records = (v: unknown): AnyRecord[] => (Array.isArray(v) ? v.filter(isRecord) : []);
const num = (v: unknown): number | null => {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
};
const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() !== '' ? v.trim() : null);
const type = (v: unknown): EntryType | null => (v === 'revenu' || v === 'depense' || v === 'epargne' ? v : null);

export function parseBudget(raw: unknown): Budget {
  const r = isRecord(raw) ? raw : {};
  const s = isRecord(r.settings) ? r.settings : {};
  const pct = num(s.envelope_alert_pct);
  return {
    today: isDay(r.today) ? r.today : null,
    settings: {
      mode: s.mode === 'detaille' ? 'detaille' : 'essentiel',
      setupDone: s.setup_done === true,
      envelopeAlertPct: pct !== null && pct >= 50 && pct <= 100 ? pct : 80,
    },
    categories: records(r.categories)
      .map((c) => ({
        id: num(c.id) ?? 0,
        name: str(c.name) ?? '',
        color: typeof c.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(c.color) ? c.color : '#8A867E',
        family: (c.family === 'besoins' ? 'besoins' : 'envies') as Family,
        envelopeCap: num(c.envelope_cap) !== null && (num(c.envelope_cap) as number) > 0 ? (num(c.envelope_cap) as number) : null,
      }))
      .filter((c) => c.id > 0 && c.name !== ''),
    recurring: records(r.recurring)
      .map((e) => {
        const day = num(e.day_of_month);
        return {
          id: num(e.id) ?? 0,
          type: type(e.type),
          category: str(e.category),
          label: str(e.label) ?? '',
          amount: Math.max(0, num(e.amount) ?? 0),
          day: day !== null && Number.isInteger(day) && day >= 1 && day <= 31 ? day : null,
        };
      })
      .filter((e): e is Recurring => e.id > 0 && e.type !== null),
    entries: records(r.entries)
      .map((e) => ({
        id: num(e.id) ?? 0,
        type: type(e.type),
        category: str(e.category),
        label: str(e.label) ?? '',
        amount: Math.max(0, num(e.amount) ?? 0),
        on: isDay(e.occurred_on) ? e.occurred_on : null,
      }))
      .filter((e): e is Entry => e.id > 0 && e.type !== null && e.on !== null),
    balances: records(r.balances)
      .map((b) => ({ amount: num(b.amount), on: isDay(b.recorded_on) ? b.recorded_on : null }))
      .filter((b): b is Balance => b.amount !== null && b.on !== null)
      .sort((a, b) => (a.on < b.on ? -1 : a.on > b.on ? 1 : 0)),
    reviews: records(r.reviews)
      .map((v) => ({ month: str(v.month) ?? '', answer: str(v.answer) ?? '' }))
      .filter((v) => /^\d{4}-\d{2}$/.test(v.month) && v.answer !== ''),
    legacy: records(r.legacy)
      .map((e) => ({ type: type(e.type), category: str(e.category), label: str(e.label) ?? '', amount: Math.max(0, num(e.amount) ?? 0) }))
      .filter((e): e is LegacyItem => e.type !== null),
  };
}

// Famille d'une catégorie (envies si la catégorie est inconnue)
export function familyOf(categories: readonly BudgetCategory[], name: string | null): Family {
  return categories.find((c) => c.name === name)?.family ?? 'envies';
}
