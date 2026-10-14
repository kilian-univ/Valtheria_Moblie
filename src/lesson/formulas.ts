// Formules des simulateurs (écran simulator), désignées par leur nom dans la
// leçon (payload.formula) et paramétrées par payload.params. Fonctions pures,
// sans React : testables avec Node.

export type FormulaResult = Record<string, number>;
type Formula = (x: number, params: Record<string, number>) => FormulaResult;

// Versements mensuels de fin de mois, de l'âge x jusqu'à end_age, au taux
// annuel rate (taux mensuel équivalent : (1 + rate) puissance 1/12, moins 1).
// params : monthly, rate, end_age. Résultats : capital, paid.
function savingsFromAge(x: number, { monthly = 100, rate = 0.05, end_age = 65 }: Record<string, number>): FormulaResult {
  const months = Math.max(0, Math.round((end_age - x) * 12));
  const r = Math.pow(1 + rate, 1 / 12) - 1;
  const capital = r === 0 ? monthly * months : (monthly * (Math.pow(1 + r, months) - 1)) / r;
  return { capital, paid: monthly * months };
}

// Crédit amortissable sur x années : mensualité = capital × t / (1 − (1 + t)
// puissance (−n)), t = rate / 12, n = nombre de mois. params : capital, rate.
// Résultats : monthly, interest (coût total des intérêts).
function loanOverYears(x: number, { capital = 200000, rate = 0.035 }: Record<string, number>): FormulaResult {
  const n = Math.max(1, Math.round(x * 12));
  const t = rate / 12;
  const monthly = t === 0 ? capital / n : (capital * t) / (1 - Math.pow(1 + t, -n));
  return { monthly, interest: monthly * n - capital };
}

export const FORMULAS: Record<string, Formula> = {
  savings_from_age: savingsFromAge,
  loan_over_years: loanOverYears,
};

// Formule inconnue : aucun résultat (l'écran affiche des tirets)
export function computeFormula(name: string, x: number, params: Record<string, number>): FormulaResult {
  const formula = FORMULAS[name];
  return formula ? formula(x, params) : {};
}

// ---------------------------------------------------------------------------
// Courbes des simulateurs : l'argent qui grossit sur la durée
// ---------------------------------------------------------------------------

// main : la courbe pleine (capital, intérêts cumulés) ; base : la courbe en
// pointillés (versements, capital remboursé) ; from / to : bornes de la durée
// sous la courbe ; legend : libellés des deux courbes. Autant de points que
// demandé, régulièrement espacés de 0 à la durée.
export type FormulaSeries = {
  main: number[];
  base: number[];
  from: string;
  to: string;
  legend: [string, string];
};

const SERIES_POINTS = 24;

function years(n: number): string {
  return `${n} ${n >= 2 ? 'ans' : 'an'}`;
}

// Épargne : de l'âge de départ à end_age, capital et total versé
function savingsSeries(x: number, params: Record<string, number>, points: number): FormulaSeries {
  const endAge = params.end_age ?? 65;
  const span = Math.max(0, endAge - x);
  const main: number[] = [];
  const base: number[] = [];
  for (let i = 0; i < points; i++) {
    // Capital au même âge : une épargne commencée à x, arrêtée à x + t
    const age = x + (span * i) / (points - 1);
    const at = savingsFromAge(x, { ...params, end_age: age });
    main.push(at.capital);
    base.push(at.paid);
  }
  return { main, base, from: years(Math.round(x)), to: years(Math.round(endAge)), legend: ['ton capital', 'tes versements'] };
}

// Crédit sur x années : intérêts cumulés et capital remboursé, mois après mois
function loanSeries(x: number, params: Record<string, number>, points: number): FormulaSeries {
  const capital = params.capital ?? 200000;
  const rate = params.rate ?? 0.035;
  const n = Math.max(1, Math.round(x * 12));
  const t = rate / 12;
  const { monthly } = loanOverYears(x, params);
  const main: number[] = [];
  const base: number[] = [];
  for (let i = 0; i < points; i++) {
    const k = Math.round((n * i) / (points - 1));
    // Capital restant dû après k mensualités
    const remaining = t === 0 ? capital - monthly * k : capital * Math.pow(1 + t, k) - (monthly * (Math.pow(1 + t, k) - 1)) / t;
    const repaid = capital - Math.max(0, remaining);
    main.push(monthly * k - repaid);
    base.push(repaid);
  }
  return { main, base, from: 'Aujourd’hui', to: years(Math.round(x)), legend: ['intérêts cumulés', 'capital remboursé'] };
}

const SERIES: Record<string, (x: number, params: Record<string, number>, points: number) => FormulaSeries> = {
  savings_from_age: savingsSeries,
  loan_over_years: loanSeries,
};

// Courbe d'une formule pour la valeur x du curseur ; null : formule sans
// courbe (le simulateur n'en montre pas)
export function formulaSeries(
  name: string,
  x: number,
  params: Record<string, number>,
  points: number = SERIES_POINTS
): FormulaSeries | null {
  const series = SERIES[name];
  return series ? series(x, params, Math.max(2, points)) : null;
}

// Plus haute valeur des deux courbes sur toute la plage du curseur : l'échelle
// reste la même quand on bouge le curseur (la courbe grandit ou rétrécit)
export function seriesScale(name: string, min: number, max: number, params: Record<string, number>): number {
  let top = 0;
  for (const x of [min, max, (min + max) / 2]) {
    const s = formulaSeries(name, x, params);
    if (s) top = Math.max(top, ...s.main, ...s.base);
  }
  return top;
}
