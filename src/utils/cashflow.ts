// Réponse de GET /cashflow lue une fois, à son arrivée : listes et totaux
// toujours présents, pour qu'une réponse incomplète (maintenance, champ
// absent) ne fasse jamais planter l'écran. Fonctions pures, testables avec Node.

export type CashflowTab = 'revenus' | 'depenses' | 'epargne';
export type CategoryTotal = { category: string; total: number; color: string };
type Entry = { id: number; [key: string]: unknown };

export type CashflowData<E extends Entry = Entry> = {
  period_month: string;
  entries: Record<CashflowTab, E[]>;
  by_category: { depenses: CategoryTotal[] };
  totals: { revenus: number; depenses: number; epargne: number; budget: number; reste: number };
  default_categories: string[];
  revenu_suggestions: string[];
  guide_done: boolean;
};

type AnyRecord = Record<string, unknown>;
const isRecord = (v: unknown): v is AnyRecord => !!v && typeof v === 'object' && !Array.isArray(v);
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : Number(v) || 0);
const strings = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

function entries<E extends Entry>(v: unknown): E[] {
  return Array.isArray(v) ? (v.filter((e) => isRecord(e) && (typeof e.id === 'number' || typeof e.id === 'string')) as E[]) : [];
}

export function normalizeCashflow<E extends Entry = Entry>(raw: unknown): CashflowData<E> {
  const r = isRecord(raw) ? raw : {};
  const e = isRecord(r.entries) ? r.entries : {};
  const byCat = isRecord(r.by_category) ? r.by_category : {};
  const t = isRecord(r.totals) ? r.totals : {};
  const depenses = Array.isArray(byCat.depenses)
    ? byCat.depenses.filter(isRecord).map((c) => ({ category: String(c.category ?? ''), total: num(c.total), color: typeof c.color === 'string' ? c.color : '' }))
    : [];
  return {
    period_month: typeof r.period_month === 'string' ? r.period_month : '',
    entries: { revenus: entries<E>(e.revenus), depenses: entries<E>(e.depenses), epargne: entries<E>(e.epargne) },
    by_category: { depenses },
    totals: { revenus: num(t.revenus), depenses: num(t.depenses), epargne: num(t.epargne), budget: num(t.budget), reste: num(t.reste) },
    default_categories: strings(r.default_categories),
    revenu_suggestions: strings(r.revenu_suggestions),
    guide_done: r.guide_done === true,
  };
}
