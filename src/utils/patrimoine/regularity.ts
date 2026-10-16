// La régularité : une série de MOIS où la personne a fait au moins un
// versement (un achat, ou un dépôt sur un livret). Les ventes et le nombre
// d'opérations ne comptent jamais. Sans React : testable avec Node.

// « 2026-10 »
export type MonthKey = string;

export function monthKey(date: Date): MonthKey {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function shift(key: MonthKey, delta: number): MonthKey {
  const [y, m] = key.split('-').map(Number);
  return monthKey(new Date(y, m - 1 + delta, 1));
}

export type Deposit = { at: string; side?: 'buy' | 'sell' };

// Mois avec au moins un versement (les ventes sont écartées)
export function depositMonths(deposits: readonly Deposit[]): MonthKey[] {
  const set = new Set<MonthKey>();
  for (const d of deposits) {
    if (d.side === 'sell') continue;
    const t = new Date(d.at);
    if (!Number.isNaN(t.getTime())) set.add(monthKey(t));
  }
  return [...set].sort();
}

// Série en cours : les mois d'affilée jusqu'à ce mois-ci. Le mois en cours
// n'est pas fini : sans versement encore, la série court jusqu'au mois dernier.
export function currentStreak(months: readonly MonthKey[], now: Date): number {
  const set = new Set(months);
  let cursor = monthKey(now);
  if (!set.has(cursor)) cursor = shift(cursor, -1);
  let n = 0;
  while (set.has(cursor)) {
    n += 1;
    cursor = shift(cursor, -1);
  }
  return n;
}

// Meilleure série de tous les temps
export function bestStreak(months: readonly MonthKey[]): number {
  const sorted = [...new Set(months)].sort();
  let best = 0;
  let run = 0;
  let prev: MonthKey | null = null;
  for (const m of sorted) {
    run = prev !== null && shift(prev, 1) === m ? run + 1 : 1;
    best = Math.max(best, run);
    prev = m;
  }
  return best;
}

// « 3 mois d'affilée » ; « 1 mois » ; rien sous 1
export function streakLabel(n: number): string | null {
  if (n < 1) return null;
  return n === 1 ? '1 mois de versement' : `${n} mois d’affilée`;
}
