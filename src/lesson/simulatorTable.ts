// Table d'un simulateur : pour chaque cran du curseur, les résultats de la
// formule et les deux courbes, calculés une fois en JavaScript. Pendant un
// glissement, le fil d'interface n'a qu'à lire la bonne ligne (lot 8 : aucun
// rendu React pendant le geste). Fonctions pures, sans React : testables avec
// Node.

import { computeFormula, type FormulaResult, formulaSeries } from './formulas';

// Au-delà, un cran sur `stride` seulement (les simulateurs des leçons en ont
// quelques dizaines)
export const SIM_TABLE_MAX_ROWS = 600;

export type SimulatorTable = {
  // Valeur du curseur de chaque ligne
  values: number[];
  // Écart, en crans, entre deux lignes
  stride: number;
  results: FormulaResult[];
  // Courbe pleine et courbe en pointillés de chaque ligne (vides sans courbe)
  main: number[][];
  base: number[][];
  // Borne de gauche sous la courbe (« 30 ans »), par ligne
  from: string[];
};

export function simulatorTable(
  formula: string,
  params: Record<string, number>,
  min: number,
  max: number,
  step: number,
  maxRows: number = SIM_TABLE_MAX_ROWS
): SimulatorTable {
  const safeStep = step > 0 ? step : 1;
  const crans = Math.max(0, Math.round((max - min) / safeStep));
  const stride = Math.max(1, Math.ceil((crans + 1) / maxRows));
  const table: SimulatorTable = { values: [], stride, results: [], main: [], base: [], from: [] };
  for (let k = 0; k <= crans; k += stride) {
    const value = Math.min(max, min + k * safeStep);
    table.values.push(value);
    table.results.push(computeFormula(formula, value, params));
    const series = formulaSeries(formula, value, params);
    table.main.push(series ? series.main : []);
    table.base.push(series ? series.base : []);
    table.from.push(series ? series.from : '');
  }
  // La borne haute a toujours sa ligne
  if (table.values[table.values.length - 1] !== max && crans > 0) {
    table.values.push(max);
    table.results.push(computeFormula(formula, max, params));
    const series = formulaSeries(formula, max, params);
    table.main.push(series ? series.main : []);
    table.base.push(series ? series.base : []);
    table.from.push(series ? series.from : '');
  }
  return table;
}

// Ligne de la table pour une valeur du curseur (fil d'interface ou JavaScript)
export function tableRow(value: number, min: number, step: number, stride: number, rows: number): number {
  'worklet';
  const raw = (value - min) / ((step > 0 ? step : 1) * stride);
  return Math.min(rows - 1, Math.max(0, Math.round(raw)));
}

// Courbe entre deux lignes voisines (position fractionnaire : la courbe passe
// en douceur d'une forme à l'autre)
export function blendRows(rows: number[][], position: number): number[] {
  'worklet';
  if (rows.length === 0) return [];
  const p = Math.min(rows.length - 1, Math.max(0, position));
  const a = Math.floor(p);
  const b = Math.min(rows.length - 1, a + 1);
  const t = p - a;
  const from = rows[a];
  const to = rows[b];
  const out: number[] = [];
  for (let i = 0; i < from.length; i++) out.push(from[i] + ((to[i] ?? from[i]) - from[i]) * t);
  return out;
}

// Tracé SVG d'une courbe : `values` régulièrement espacées sur `width`,
// hauteur `height`, marge `pad`, valeur du haut `top`
export function linePath(values: number[], width: number, height: number, pad: number, top: number): string {
  'worklet';
  const scaleTop = Math.max(top, 1e-9);
  let d = '';
  for (let i = 0; i < values.length; i++) {
    const x = (i / Math.max(1, values.length - 1)) * width;
    const y = pad + (1 - Math.max(0, values[i]) / scaleTop) * (height - 2 * pad);
    d += `${i === 0 ? 'M' : ' L'}${x.toFixed(1)},${y.toFixed(1)}`;
  }
  return d;
}
