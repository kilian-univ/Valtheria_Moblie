// Courbes du suivi de patrimoine : périodes, modes (valeur, plus-value,
// performance), points de versement, toucher-glisser et phrase pour le lecteur
// d'écran. Sans React : testable avec Node.

import type { ChartPoint, Operation, PricePoint } from './model';

export type Period = '1J' | '1S' | '1M' | 'YTD' | '1A' | '5A' | 'Tout';
export const PERIODS: readonly Period[] = ['1J', '1S', '1M', 'YTD', '1A', '5A', 'Tout'];
export const DEFAULT_PERIOD: Period = '1A';

export type ChartMode = 'valeur' | 'plus-value' | 'performance';
export const CHART_MODES: readonly { key: ChartMode; label: string }[] = [
  { key: 'valeur', label: 'Valeur' },
  { key: 'plus-value', label: 'Plus-value' },
  { key: 'performance', label: 'Performance' },
];

const DAY = 86_400_000;

// Plage demandée à GET /api/portfolio/chart, puis filtrée sur le téléphone
export function portfolioRange(period: Period): '1d' | '1w' | '1m' | '1y' | 'max' {
  return ({ '1J': '1d', '1S': '1w', '1M': '1m', YTD: '1y', '1A': '1y', '5A': 'max', Tout: 'max' } as const)[period];
}

// Plage demandée à GET /api/prices/history (cours d'un actif)
export function priceRange(period: Period): '1W' | '1M' | '1Y' | 'MAX' {
  return ({ '1J': '1W', '1S': '1W', '1M': '1M', YTD: '1Y', '1A': '1Y', '5A': 'MAX', Tout: 'MAX' } as const)[period];
}

// Début de la période (null : depuis le début)
export function periodStart(period: Period, now: Date): number | null {
  const t = now.getTime();
  switch (period) {
    case '1J':
      return t - DAY;
    case '1S':
      return t - 7 * DAY;
    case '1M':
      return t - 30 * DAY;
    case 'YTD':
      return new Date(now.getFullYear(), 0, 1).getTime();
    case '1A':
      return t - 365 * DAY;
    case '5A':
      return t - 5 * 365 * DAY;
    default:
      return null;
  }
}

export function periodLabel(period: Period): string {
  return {
    '1J': 'sur 1 jour',
    '1S': 'sur 1 semaine',
    '1M': 'sur 1 mois',
    YTD: 'depuis le 1er janvier',
    '1A': 'sur 1 an',
    '5A': 'sur 5 ans',
    Tout: 'depuis le début',
  }[period];
}

export function periodSpoken(period: Period): string {
  return { '1J': '1 jour', '1S': '1 semaine', '1M': '1 mois', YTD: 'année en cours', '1A': '1 an', '5A': '5 ans', Tout: 'tout' }[period];
}

export function clipPoints(points: ChartPoint[], period: Period, now: Date): ChartPoint[] {
  const start = periodStart(period, now);
  return start === null ? points : points.filter((p) => Date.parse(p.date) >= start - 1000);
}

export function clipPrices(points: PricePoint[], period: Period, now: Date): PricePoint[] {
  const start = periodStart(period, now);
  return start === null ? points : points.filter((p) => p.t >= start - 1000);
}

// Valeur tracée selon le mode ; null quand elle n'a pas de sens (performance
// sans montant investi)
export function modeValue(p: ChartPoint, mode: ChartMode): number | null {
  if (mode === 'valeur') return p.value;
  if (mode === 'plus-value') return p.value - p.invested;
  return p.invested > 0 ? ((p.value - p.invested) / p.invested) * 100 : null;
}

// Points où l'argent investi augmente : un versement (achat, dépôt)
export function depositIndexes(points: ChartPoint[], threshold = 0.5): number[] {
  const out: number[] = [];
  for (let i = 1; i < points.length; i++) {
    if (points[i].invested > points[i - 1].invested + threshold) out.push(i);
  }
  return out;
}

export type Variation = { from: number; to: number; delta: number; pct: number | null };

// Variation de la valeur sur la période (premier → dernier point)
export function variation(points: ChartPoint[]): Variation | null {
  if (points.length < 2) return null;
  const from = points[0].value;
  const to = points[points.length - 1].value;
  return { from, to, delta: to - from, pct: from > 0 ? ((to - from) / from) * 100 : null };
}

// Repère de la courbe : bornes et passage valeur ↔ pixel
export type Frame = { width: number; height: number; padTop: number; padBottom: number };

export type Scale = {
  min: number;
  max: number;
  x: (i: number) => number;
  y: (v: number) => number;
  index: (x: number) => number;
};

export function makeScale(values: number[], count: number, frame: Frame, extra: number[] = []): Scale {
  const all = [...values, ...extra].filter((v) => Number.isFinite(v));
  let min = all.length ? Math.min(...all) : 0;
  let max = all.length ? Math.max(...all) : 1;
  if (max - min < 1e-9) {
    const pad = Math.abs(max) * 0.05 || 1;
    min -= pad;
    max += pad;
  }
  const span = max - min;
  const inner = frame.height - frame.padTop - frame.padBottom;
  const step = count > 1 ? frame.width / (count - 1) : 0;
  return {
    min,
    max,
    x: (i) => (count > 1 ? i * step : frame.width / 2),
    y: (v) => frame.padTop + (1 - (v - min) / span) * inner,
    index: (x) => (count > 1 ? Math.max(0, Math.min(count - 1, Math.round(x / step))) : 0),
  };
}

// Tracé SVG d'une suite de valeurs (les null coupent la ligne)
export function linePath(values: (number | null)[], scale: Scale): string {
  let d = '';
  let pen = false;
  values.forEach((v, i) => {
    if (v === null) {
      pen = false;
      return;
    }
    d += `${pen ? 'L' : 'M'}${scale.x(i).toFixed(1)} ${scale.y(v).toFixed(1)} `;
    pen = true;
  });
  return d.trim();
}

export function areaPath(values: number[], scale: Scale, bottom: number): string {
  if (values.length < 2) return '';
  const line = linePath(values, scale);
  return `${line} L${scale.x(values.length - 1).toFixed(1)} ${bottom} L${scale.x(0).toFixed(1)} ${bottom} Z`;
}

// Opérations placées sur la courbe d'un cours : l'indice du point le plus
// proche de leur date ; hors période : écartées
export type OperationMark = { index: number; side: Operation['side']; operationId: number };

export function operationMarks(points: PricePoint[], operations: Operation[]): OperationMark[] {
  if (points.length < 2) return [];
  const first = points[0].t;
  const last = points[points.length - 1].t;
  const marks: OperationMark[] = [];
  for (const op of operations) {
    const t = Date.parse(op.executedAt);
    if (!Number.isFinite(t) || t < first - DAY || t > last + DAY) continue;
    let best = 0;
    for (let i = 1; i < points.length; i++) {
      if (Math.abs(points[i].t - t) < Math.abs(points[best].t - t)) best = i;
    }
    marks.push({ index: best, side: op.side, operationId: op.id });
  }
  return marks;
}

// « Ton patrimoine est passé de 42 000 € à 48 320 € sur 1 an. »
export function chartSummary(
  points: ChartPoint[],
  period: Period,
  money: (v: number) => string,
  subject = 'Ton patrimoine'
): string {
  const v = variation(points);
  if (!v) return `${subject} : pas encore assez de points pour tracer une courbe ${periodLabel(period)}.`;
  const verb = Math.abs(v.delta) < 0.005 ? 'est resté' : 'est passé';
  if (verb === 'est resté') return `${subject} est resté à ${money(v.to)} ${periodLabel(period)}.`;
  return `${subject} ${verb} de ${money(v.from)} à ${money(v.to)} ${periodLabel(period)}.`;
}

export function priceSummary(points: PricePoint[], period: Period, money: (v: number) => string, name: string): string {
  if (points.length < 2) return `Cours de ${name} : pas encore assez de points ${periodLabel(period)}.`;
  const from = points[0].price;
  const to = points[points.length - 1].price;
  return `Le cours de ${name} est passé de ${money(from)} à ${money(to)} ${periodLabel(period)}.`;
}
