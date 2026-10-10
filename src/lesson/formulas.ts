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
