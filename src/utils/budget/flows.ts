// Cash-flow d'un mois (ou d'un trimestre, d'une année) : d'où vient l'argent,
// où il part. Les charges fixes et l'épargne prévue comptent pour le mois
// entier ; le reste vient de ce qui est noté (mode Détaillé) ou se déduit des
// soldes relevés (mode Essentiel : une seule bande « Dépenses courantes »).
// Fonctions pures, testables avec Node.
//
// Dépenses courantes entre deux relevés R1 et R2 (jours de R1 exclu à R2
// inclus) : solde R1 + rentrées − charges fixes − épargne − solde R2. Le
// montant est réparti jour par jour sur les mois qu'il couvre.

import { addDays, daysBetween, daysInMonth, monthKey, occurrencesBetween, shiftMonth, type Day } from './dates';
import { mainIncome, round2 } from './calc';
import { categoryLabel } from './categories';
import { NBSP } from '@/src/utils/frenchSpaces';
import type { Balance, Budget, BudgetMode, Entry, Family, Recurring } from './model';
import { familyOf } from './model';

export type FlowFamily = Family | 'courantes' | 'epargne';
export const FLOW_FAMILIES: readonly FlowFamily[] = ['besoins', 'envies', 'courantes', 'epargne'];
export const FAMILY_NAMES: Record<FlowFamily, string> = {
  besoins: 'Besoins',
  envies: 'Envies',
  courantes: 'Dépenses courantes',
  epargne: 'Épargne',
};

// En deçà, un mois passé n'a pas assez de relevés pour estimer ses dépenses
// courantes
export const MIN_COVERED_DAYS = 7;

export type Poste = { key: string; label: string; family: FlowFamily; amount: number };
export type Source = { label: string; amount: number };

export type MonthFlow = {
  month: string;
  hasData: boolean;
  current: boolean;
  income: number;
  sources: Source[];
  // Charges fixes du mois
  charges: number;
  // Dépenses notées (Détaillé) ou dépenses courantes (Essentiel) ; null si
  // elles ne sont pas connues (pas assez de relevés)
  variable: number | null;
  spent: number | null;
  // Épargne prévue (virements du jour de paie)
  planned: number;
  // Rentrées − dépenses (épargne réelle, peut être négative)
  saved: number | null;
  rate: number | null;
  // Ce qui reste après l'épargne prévue
  rest: number | null;
  postes: Poste[];
  // Mode Essentiel : dépenses courantes estimées à partir d'une partie du mois
  estimated: boolean;
  // Mois en cours : dépenses courantes connues jusqu'à ce jour
  until: Day | null;
};

type Ctx = Pick<Budget, 'recurring' | 'entries' | 'balances' | 'categories'>;

export function keyOf(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}
export function parseKey(key: string): { year: number; month: number } {
  return { year: Number(key.slice(0, 4)), month: Number(key.slice(5, 7)) };
}
export function shiftKey(key: string, n: number): string {
  const { year, month } = parseKey(key);
  const m = shiftMonth(year, month, n);
  return keyOf(m.year, m.month);
}

function countIn(recurring: readonly Recurring[], type: Recurring['type'], from: Day, to: Day): number {
  // Jours de from exclu à to inclus
  const end = addDays(to, 1);
  let total = 0;
  for (const r of recurring) if (r.type === type && r.day !== null) total += r.amount * occurrencesBetween(r.day, from, end).length;
  return total;
}

// Dépenses courantes par mois, déduites des soldes : montant et nombre de
// jours couverts par des relevés
export function courantesByMonth({
  recurring,
  balances,
  entries = [],
}: {
  recurring: readonly Recurring[];
  balances: readonly Balance[];
  entries?: readonly Entry[];
}): Map<string, { amount: number; days: number; last: Day }> {
  const out = new Map<string, { amount: number; days: number; last: Day }>();
  for (let i = 0; i + 1 < balances.length; i++) {
    const a = balances[i];
    const b = balances[i + 1];
    const n = daysBetween(a.on, b.on);
    if (n <= 0) continue;
    const received = entries.filter((e) => e.type === 'revenu' && e.on > a.on && e.on <= b.on).reduce((s, e) => s + e.amount, 0);
    const amount = Math.max(
      0,
      a.amount + countIn(recurring, 'revenu', a.on, b.on) + received - countIn(recurring, 'depense', a.on, b.on) - countIn(recurring, 'epargne', a.on, b.on) - b.amount
    );
    for (let d = addDays(a.on, 1); d <= b.on; d = addDays(d, 1)) {
      const k = monthKey(d);
      const cur = out.get(k) ?? { amount: 0, days: 0, last: d };
      out.set(k, { amount: cur.amount + amount / n, days: cur.days + 1, last: d });
    }
  }
  return out;
}

// Premier mois suivi : celui du premier relevé (et, en Détaillé, de la
// première dépense notée)
export function firstMonth(ctx: Ctx, mode: BudgetMode): string | null {
  const keys = ctx.balances.map((b) => monthKey(b.on));
  if (mode === 'detaille') keys.push(...ctx.entries.map((e) => monthKey(e.on)));
  return keys.length ? keys.sort()[0] : null;
}

function addPoste(map: Map<string, Poste>, p: Poste) {
  const cur = map.get(p.key);
  map.set(p.key, cur ? { ...cur, amount: cur.amount + p.amount } : p);
}

function chargeKey(category: string | null, label: string): { key: string; label: string } {
  return category ? { key: `c:${category}`, label: categoryLabel(category) } : { key: `l:${label}`, label };
}

export function monthFlow(ctx: Ctx, key: string, today: Day, mode: BudgetMode, courantes = courantesByMonth(ctx)): MonthFlow {
  const current = key === monthKey(today);
  const start = firstMonth(ctx, mode);
  const empty: MonthFlow = {
    month: key,
    hasData: false,
    current,
    income: 0,
    sources: [],
    charges: 0,
    variable: null,
    spent: null,
    planned: 0,
    saved: null,
    rate: null,
    rest: null,
    postes: [],
    estimated: false,
    until: null,
  };
  if (!start || key < start || key > monthKey(today)) return empty;

  const inMonth = ctx.entries.filter((e) => e.on.startsWith(key) && e.on <= today);
  const pay = mainIncome(ctx.recurring);
  const others = ctx.recurring.filter((r) => r.type === 'revenu' && r !== pay).reduce((s, r) => s + r.amount, 0) + inMonth.filter((e) => e.type === 'revenu').reduce((s, e) => s + e.amount, 0);
  const sources: Source[] = [];
  if (pay) sources.push({ label: pay.label || 'Paie', amount: pay.amount });
  if (others > 0) sources.push({ label: 'Autres rentrées', amount: round2(others) });
  const income = round2(sources.reduce((s, x) => s + x.amount, 0));

  const postes = new Map<string, Poste>();
  let charges = 0;
  for (const r of ctx.recurring) {
    if (r.type !== 'depense') continue;
    charges += r.amount;
    const k = chargeKey(r.category, r.label);
    addPoste(postes, { ...k, family: familyOf(ctx.categories, r.category), amount: r.amount });
  }

  let variable: number | null;
  let estimated = false;
  let until: Day | null = null;
  if (mode === 'detaille') {
    variable = 0;
    for (const e of inMonth) {
      if (e.type !== 'depense') continue;
      variable += e.amount;
      const k = chargeKey(e.category ?? 'Autres', e.label);
      addPoste(postes, { ...k, family: familyOf(ctx.categories, e.category), amount: e.amount });
    }
  } else {
    const c = courantes.get(key);
    const { year, month } = parseKey(key);
    const days = daysInMonth(year, month);
    if (current) {
      variable = c?.amount ?? 0;
      until = c?.last ?? null;
    } else if (c && c.days >= days) variable = c.amount;
    else if (c && c.days >= MIN_COVERED_DAYS) {
      variable = (c.amount * days) / c.days;
      estimated = true;
    } else variable = null;
    if (variable !== null && variable > 0.005) addPoste(postes, { key: 'courantes', label: 'Dépenses courantes', family: 'courantes', amount: variable });
  }

  let planned = 0;
  for (const r of ctx.recurring) {
    if (r.type !== 'epargne') continue;
    planned += r.amount;
    addPoste(postes, { key: `s:${r.label}`, label: r.label || 'Épargne', family: 'epargne', amount: r.amount });
  }
  const spent = variable === null ? null : round2(charges + variable);
  const saved = spent === null ? null : round2(income - spent);
  const rest = saved === null ? null : round2(saved - planned);
  if (rest !== null && rest > 0.5) addPoste(postes, { key: 'rest', label: 'Resté sur le compte', family: 'epargne', amount: rest });

  return {
    month: key,
    hasData: true,
    current,
    income,
    sources,
    charges: round2(charges),
    variable: variable === null ? null : round2(variable),
    spent,
    planned: round2(planned),
    saved,
    rate: saved !== null && income > 0 ? saved / income : null,
    rest,
    postes: sortPostes([...postes.values()].map((p) => ({ ...p, amount: round2(p.amount) })).filter((p) => p.amount > 0.005)),
    estimated,
    until,
  };
}

function sortPostes(list: Poste[]): Poste[] {
  return list.sort((a, b) => FLOW_FAMILIES.indexOf(a.family) - FLOW_FAMILIES.indexOf(b.family) || (a.key === 'rest' ? 1 : b.key === 'rest' ? -1 : 0) || b.amount - a.amount);
}

export type Period = 'mois' | 'trimestre' | 'annee';

// Mois d'une période qui contient « key » (jusqu'au mois en cours)
export function periodMonths(key: string, period: Period, today: Day): string[] {
  const { year, month } = parseKey(key);
  const first = period === 'mois' ? month : period === 'trimestre' ? month - ((month - 1) % 3) : 1;
  const count = period === 'mois' ? 1 : period === 'trimestre' ? 3 : 12;
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const k = keyOf(year, first + i);
    if (k <= monthKey(today)) out.push(k);
  }
  return out;
}

// Période voisine : même taille, n périodes plus tôt ou plus tard
export function shiftPeriod(key: string, period: Period, n: number): string {
  return shiftKey(key, n * (period === 'mois' ? 1 : period === 'trimestre' ? 3 : 12));
}

export type PeriodFlow = Omit<MonthFlow, 'month' | 'current' | 'until'> & {
  months: string[];
  // Mois inclus (ceux dont les dépenses sont connues)
  counted: string[];
  current: boolean;
  until: Day | null;
};

// Somme des mois d'une période dont les dépenses sont connues
export function periodFlow(ctx: Ctx, months: readonly string[], today: Day, mode: BudgetMode): PeriodFlow {
  const courantes = courantesByMonth(ctx);
  const flows = months.map((m) => monthFlow(ctx, m, today, mode, courantes)).filter((f) => f.hasData && f.spent !== null);
  const sum = (pick: (f: MonthFlow) => number) => round2(flows.reduce((s, f) => s + pick(f), 0));
  const postes = new Map<string, Poste>();
  const sources = new Map<string, Source>();
  for (const f of flows) {
    for (const p of f.postes) addPoste(postes, p);
    for (const s of f.sources) sources.set(s.label, { label: s.label, amount: (sources.get(s.label)?.amount ?? 0) + s.amount });
  }
  const income = sum((f) => f.income);
  const spent = flows.length ? sum((f) => f.spent ?? 0) : null;
  const saved = spent === null ? null : round2(income - spent);
  const planned = sum((f) => f.planned);
  const last = flows[flows.length - 1];
  return {
    months: [...months],
    counted: flows.map((f) => f.month),
    hasData: flows.length > 0,
    current: !!last?.current,
    until: last?.until ?? null,
    income,
    sources: [...sources.values()].map((s) => ({ ...s, amount: round2(s.amount) })),
    charges: sum((f) => f.charges),
    variable: flows.length ? sum((f) => f.variable ?? 0) : null,
    spent,
    planned,
    saved,
    rate: saved !== null && income > 0 ? saved / income : null,
    rest: saved === null ? null : round2(saved - planned),
    postes: sortPostes([...postes.values()].map((p) => ({ ...p, amount: round2(p.amount) }))),
    estimated: flows.some((f) => f.estimated),
  };
}

// Taux d'épargne en points entiers (« 20 » pour 20 %)
export function ratePoints(rate: number | null): number | null {
  return rate === null ? null : Math.round(rate * 100);
}

// Taux d'épargne des six derniers mois (jusqu'à « key »)
export function rateSeries(ctx: Ctx, key: string, today: Day, mode: BudgetMode, count = 6): { month: string; rate: number | null }[] {
  const courantes = courantesByMonth(ctx);
  const out: { month: string; rate: number | null }[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const m = shiftKey(key, -i);
    out.push({ month: m, rate: monthFlow(ctx, m, today, mode, courantes).rate });
  }
  return out;
}

export type FamilyTotal = { family: FlowFamily; amount: number };

export function familyTotals(postes: readonly Poste[]): FamilyTotal[] {
  return FLOW_FAMILIES.map((family) => ({ family, amount: round2(postes.filter((p) => p.family === family).reduce((s, p) => s + p.amount, 0)) })).filter(
    (f) => f.amount > 0.005
  );
}

export type CategoryRow = { key: string; label: string; family: FlowFamily; amount: number; average: number | null; change: number | null };

// Dépenses de la période par poste, comparées à la moyenne des périodes
// précédentes qui ont des données (trois au plus)
export function compareToAverage(current: PeriodFlow, previous: readonly PeriodFlow[]): CategoryRow[] {
  const before = previous.filter((p) => p.hasData).slice(0, 3);
  return current.postes
    .filter((p) => p.family !== 'epargne')
    .sort((a, b) => b.amount - a.amount)
    .map((p) => {
      if (!before.length) return { ...p, average: null, change: null };
      const average = before.reduce((s, f) => s + (f.postes.find((x) => x.key === p.key)?.amount ?? 0), 0) / before.length;
      return { ...p, average: round2(average), change: average > 0 ? (p.amount - average) / average : null };
    });
}

// « = », « + 8 % », « − 12 % » (sans signe en deçà de 2 %)
export function changeLabel(change: number | null): string | null {
  if (change === null) return null;
  const pct = Math.round(change * 100);
  if (Math.abs(change) < 0.02 || pct === 0) return '=';
  return `${pct > 0 ? '+' : '−'}${NBSP}${Math.abs(pct)}${NBSP}%`;
}
