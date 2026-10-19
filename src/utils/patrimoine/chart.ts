// Courbes du suivi de patrimoine : périodes, modes (valeur, plus-value,
// performance), points de versement, toucher-glisser et phrase pour le lecteur
// d'écran. Sans React : testable avec Node.

import { money, shortDate } from './format';
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

// Rendement pondéré par le temps, cumulé depuis le premier point (en %) : entre
// deux relevés, l'argent ajouté ou retiré (variation du montant investi) est
// retiré du gain avant de calculer le rendement de la sous-période, puis les
// sous-périodes sont enchaînées. Les versements ne comptent donc jamais comme
// un gain : c'est ce qu'ont rapporté les placements eux-mêmes.
export function twrSeries(points: readonly ChartPoint[]): number[] {
  let growth = 1;
  return points.map((p, i) => {
    if (i > 0) {
      const prev = points[i - 1];
      const flow = p.invested - prev.invested;
      if (prev.value > 0) growth *= (p.value - flow) / prev.value;
    }
    return (growth - 1) * 100;
  });
}

// Valeur tracée à chaque point selon le mode : la valeur ; la plus-value (valeur
// moins montant investi à cette date, en euros) ; la performance (rendement
// pondéré par le temps, en %, cumulé sur la période affichée)
export function modeSeries(points: readonly ChartPoint[], mode: ChartMode): number[] {
  if (mode === 'performance') return twrSeries(points);
  return points.map((p) => (mode === 'valeur' ? p.value : p.value - p.invested));
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
// padX : marge horizontale à l'intérieur de la zone, pour qu'un point posé au
// premier ou au dernier relevé ne soit jamais coupé par le bord
export type Frame = { width: number; height: number; padTop: number; padBottom: number; padX?: number };

export type Scale = {
  // Bornes affichées (marge comprise)
  min: number;
  max: number;
  log: boolean;
  x: (i: number) => number;
  y: (v: number) => number;
  index: (x: number) => number;
  // La valeur tient-elle dans les bornes affichées ?
  contains: (v: number) => boolean;
};

// Marge au-dessus et au-dessous de la courbe (part de l'écart affiché) : la
// courbe touche presque le haut et le bas de la zone
export const SCALE_MARGIN = 0.06;

// L'axe s'adapte aux seules valeurs de la courbe affichée (jamais à zéro, ni au
// prix de revient ou au montant investi, qui ont leur étiquette en bordure),
// avec une marge. Logarithmique : un même pourcentage prend la même hauteur ;
// seulement si toutes les valeurs sont positives (sinon linéaire).
export function makeScale(values: readonly number[], count: number, frame: Frame, opts: { log?: boolean; margin?: number } = {}): Scale {
  const finite = values.filter((v) => Number.isFinite(v));
  const log = !!opts.log && finite.length > 0 && finite.every((v) => v > 0);
  const t = (v: number) => (log ? Math.log(v) : v);
  const all = finite.map(t);
  let lo = all.length ? Math.min(...all) : 0;
  let hi = all.length ? Math.max(...all) : 1;
  if (hi - lo < 1e-9) {
    const pad = log ? 0.05 : Math.abs(hi) * 0.05 || 1;
    lo -= pad;
    hi += pad;
  }
  const margin = (hi - lo) * (opts.margin ?? SCALE_MARGIN);
  lo -= margin;
  hi += margin;
  const span = hi - lo;
  const inner = frame.height - frame.padTop - frame.padBottom;
  const padX = frame.padX ?? 0;
  const step = count > 1 ? (frame.width - 2 * padX) / (count - 1) : 0;
  const back = (u: number) => (log ? Math.exp(u) : u);
  return {
    min: back(lo),
    max: back(hi),
    log,
    x: (i) => (count > 1 ? padX + i * step : frame.width / 2),
    y: (v) => {
      const u = log ? (v > 0 ? Math.log(v) : lo - span) : v;
      return frame.padTop + (1 - (u - lo) / span) * inner;
    },
    index: (x) => (count > 1 ? Math.max(0, Math.min(count - 1, Math.round((x - padX) / step))) : 0),
    contains: (v) => {
      const u = log ? (v > 0 ? Math.log(v) : -Infinity) : v;
      return u >= lo && u <= hi;
    },
  };
}

// Texte d'un repère de valeur : « 27 000 € » ; « + 10 % », « 0 % », « − 5 % »
export function tickLabel(v: number, unit: 'eur' | 'pct'): string {
  // Repère rond : sans centimes, même sous 100 € (« 10 € », pas « 10,00 € »)
  if (unit === 'eur') return Number.isInteger(v) ? money(v).replace(/,00(?=\u00a0)/, '') : money(v);
  const r = Math.round(v * 10) / 10;
  const abs = String(Math.abs(r)).replace('.', ',');
  return r === 0 ? '0\u00a0%' : `${r > 0 ? '+' : '−'}\u00a0${abs}\u00a0%`;
}

// Pas « ronds » : 1, 2, 2,5, 5 × 10^n
function niceSteps(rough: number): number[] {
  const p = 10 ** Math.floor(Math.log10(rough));
  return [1, 2, 2.5, 5, 10, 20].map((m) => m * p);
}

// Arrondi à quelques chiffres significatifs : 26 480 → 26 000, 0,01234 → 0,012
export function roundSignificant(v: number, digits = 2): number {
  if (v === 0 || !Number.isFinite(v)) return v;
  const p = 10 ** (Math.floor(Math.log10(Math.abs(v))) - digits + 1);
  return Math.round((Math.round(v / p) * p) * 1e12) / 1e12;
}

// Plus grand pas « rond » (1, 2, 2,5, 5 × 10^n) qui ne dépasse pas `limit`
function niceStepAtMost(limit: number): number {
  const p = 10 ** Math.floor(Math.log10(limit));
  return [5, 2.5, 2, 1].map((m) => m * p).find((step) => step <= limit) ?? p;
}

// Repères d'une échelle logarithmique : des valeurs régulièrement espacées en
// pourcentage (donc à la même hauteur l'une de l'autre), réparties dans la
// plage de la courbe (marges exclues), puis arrondies : par `round` s'il est
// donné, sinon toutes au même pas rond, assez fin (un tiers du plus petit
// écart) pour garder des écarts presque égaux
function logTicks(min: number, max: number, count: number, round?: (v: number) => number): number[] {
  const lo = Math.log(min);
  const hi = Math.log(max);
  const inner = (hi - lo) / (1 + 2 * SCALE_MARGIN);
  const start = lo + (hi - lo - inner) / 2;
  const ideal = Array.from({ length: count }, (_, k) => Math.exp(start + (inner * (k + 0.5)) / count));
  const gap = Math.min(...ideal.slice(1).map((v, i) => v - ideal[i]));
  const step = gap > 0 ? niceStepAtMost(gap / 3) : 0;
  const byStep = (v: number) => (step > 0 ? Math.round((Math.round(v / step) * step) * 1e12) / 1e12 : v);
  const out: number[] = [];
  for (const v0 of ideal) {
    const v = (round ?? byStep)(v0);
    if (v >= min && v <= max && !out.includes(v)) out.push(v);
  }
  return out;
}

// Trois repères de valeur arrondis proprement, dans les bornes affichées
// (deux si la plage est trop étroite). Logarithmique : sur une large plage, les
// valeurs rondes 1, 2, 5 × 10^n ; sinon des valeurs régulières en pourcentage,
// arrondies par `round` (sinon à un même pas rond) ; en dernier recours, les
// repères linéaires.
export function niceTicks(scale: Pick<Scale, 'min' | 'max' | 'log'>, count = 3, round?: (v: number) => number): number[] {
  const { min, max } = scale;
  if (!(max > min)) return [];
  if (scale.log && min > 0) {
    const out: number[] = [];
    for (let e = Math.floor(Math.log10(min)); e <= Math.ceil(Math.log10(max)); e++) {
      for (const m of [1, 2, 5]) {
        const v = m * 10 ** e;
        if (v >= min && v <= max) out.push(v);
      }
    }
    if (out.length >= 2 && out.length <= count) return out;
    if (out.length > count) {
      const pick = [0, Math.round((out.length - 1) / 2), out.length - 1];
      return [...new Set(pick)].map((i) => out[i]);
    }
    const even = logTicks(min, max, count, round);
    if (even.length >= 2) return even;
  }
  const inner = (max - min) / (1 + 2 * SCALE_MARGIN);
  const lo = min + (max - min - inner) / 2;
  const hi = lo + inner;
  for (const step of niceSteps(inner / count)) {
    const first = Math.ceil(lo / step) * step;
    const ticks: number[] = [];
    for (let v = first; v <= hi + step * 1e-9; v += step) ticks.push(Math.round(v / step) * step);
    if (ticks.length <= count) return ticks.length >= 2 ? ticks : [Math.round(((lo + hi) / 2) / step) * step];
  }
  return [];
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

// ── Échelle logarithmique selon le mode ──────────────────────────────────

export const LOG_DISABLED_PLUS_VALUE = 'Pas d’échelle logarithmique pour un montant qui peut être négatif.';
export const LOG_FALLBACK = 'Échelle linéaire : une valeur nulle ou négative sur cette période.';
export const LOG_ACTIVE = 'Échelle logarithmique';
export const LOG_ALIKE = 'Sur cette période, les deux échelles se ressemblent : les écarts sont faibles.';
// En deçà de ce rapport entre le maximum et le minimum, les deux échelles se ressemblent
export const LOG_ALIKE_RATIO = 2;

// Valeurs tracées. En Performance avec l'échelle logarithmique : la croissance
// de 1 € investi (1 + rendement), toujours positive ; sinon les valeurs du mode.
export function plottedSeries(values: readonly number[], mode: ChartMode | 'cours', log: boolean): number[] {
  return mode === 'performance' && log ? values.map((v) => 1 + v / 100) : [...values];
}

// Repère « rond » d'une croissance : rendement en pour cent entier (sous 10 %),
// sinon à deux chiffres significatifs (1,25 → + 25 %)
export function roundGrowth(g: number): number {
  const pct = (g - 1) * 100;
  const nice = Math.abs(pct) < 10 ? Math.round(pct) : roundSignificant(pct);
  return 1 + nice / 100;
}

export type LogScaleState = {
  // Échelle logarithmique réellement appliquée à la courbe
  applied: boolean;
  // Petite phrase sous la courbe (l'échelle est active, ou pourquoi elle ne l'est pas)
  note: string | null;
  // Option grisée dans le menu, avec son explication
  disabledReason: string | null;
};

// Choix mémorisé (`requested`) et ce qui est possible pour ce mode et ces
// valeurs tracées (après plottedSeries)
export function logScaleState(requested: boolean, mode: ChartMode | 'cours', plotted: readonly number[]): LogScaleState {
  if (mode === 'plus-value') return { applied: false, note: null, disabledReason: LOG_DISABLED_PLUS_VALUE };
  if (!requested) return { applied: false, note: null, disabledReason: null };
  const finite = plotted.filter((v) => Number.isFinite(v));
  if (finite.length === 0 || finite.some((v) => v <= 0)) return { applied: false, note: LOG_FALLBACK, disabledReason: null };
  const ratio = Math.max(...finite) / Math.min(...finite);
  return { applied: true, note: ratio < LOG_ALIKE_RATIO ? LOG_ALIKE : LOG_ACTIVE, disabledReason: null };
}

// ── Mise en page de la courbe ──────────────────────────────────────────────

// Hauteur de la zone tracée : 220 px sur iPhone SE (667 de haut), 260 sur un
// grand iPhone (932), entre les deux en proportion
export function chartHeight(screenHeight: number): number {
  const t = (screenHeight - 667) / (932 - 667);
  return Math.round(220 + Math.max(0, Math.min(1, t)) * 40);
}

// Repère court pour la marge de droite : « 28 k€ », « 26,5 k€ », « 200 € »,
// « + 13 % »
export function compactTick(v: number, unit: 'eur' | 'pct'): string {
  if (unit === 'pct') return tickLabel(v, 'pct');
  const abs = Math.abs(v);
  const sign = v < 0 ? '\u2212' : '';
  if (abs >= 1_000_000) return `${sign}${String(roundSignificant(abs / 1_000_000, 3)).replace('.', ',')}\u00a0M€`;
  if (abs >= 10_000) return `${sign}${String(Math.round(abs / 100) / 10).replace('.', ',')}\u00a0k€`;
  return tickLabel(v, 'eur');
}

// Le point le plus haut et le plus bas de la période (le premier atteint) ;
// null pour une courbe plate ou de moins de trois points
export function extremes(values: readonly (number | null)[]): { max: number; min: number } | null {
  let max = -1;
  let min = -1;
  values.forEach((v, i) => {
    if (v === null || !Number.isFinite(v)) return;
    if (max < 0 || v > (values[max] as number)) max = i;
    if (min < 0 || v < (values[min] as number)) min = i;
  });
  if (max < 0 || values.filter((v) => v !== null).length < 3 || values[max] === values[min]) return null;
  return { max, min };
}

export type Box = { x: number; y: number; w: number; h: number };
export type Pt = { x: number; y: number };

// Distance verticale entre une boîte et la courbe, sur la largeur de la boîte
// (négative si la courbe la traverse), et chevauchement des autres étiquettes
function clearance(box: Box, curve: readonly Pt[], obstacles: readonly Box[]): number {
  let best = Infinity;
  for (const p of curve) {
    if (p.x < box.x - 2 || p.x > box.x + box.w + 2) continue;
    const d = p.y < box.y ? box.y - p.y : p.y > box.y + box.h ? p.y - box.y - box.h : -Math.min(p.y - box.y, box.y + box.h - p.y);
    if (d < best) best = d;
  }
  for (const o of obstacles) {
    const overlap = box.x < o.x + o.w && o.x < box.x + box.w && box.y < o.y + o.h && o.y < box.y + box.h;
    if (overlap) best = Math.min(best, -100);
  }
  return best;
}

// Place une étiquette parmi des positions possibles : ramenée dans la zone,
// celle qui reste le plus loin de la courbe et des autres étiquettes
export function placeLabel(candidates: readonly Pt[], size: { w: number; h: number }, curve: readonly Pt[], zone: Box, obstacles: readonly Box[] = []): Box {
  return placeLabelScored(candidates, size, curve, zone, obstacles).box;
}

// Même placement, avec la distance gardée à la courbe (négative : aucune
// position ne l'évite, l'étiquette doit aller ailleurs)
export function placeLabelScored(
  candidates: readonly Pt[],
  size: { w: number; h: number },
  curve: readonly Pt[],
  zone: Box,
  obstacles: readonly Box[] = []
): { box: Box; clear: number } {
  let best: Box | null = null;
  let score = -Infinity;
  for (const c of candidates) {
    const box = {
      x: Math.max(zone.x, Math.min(zone.x + zone.w - size.w, c.x)),
      y: Math.max(zone.y, Math.min(zone.y + zone.h - size.h, c.y)),
      w: size.w,
      h: size.h,
    };
    const s = clearance(box, curve, obstacles);
    if (s > score) {
      score = s;
      best = box;
    }
  }
  return { box: best ?? { x: zone.x, y: zone.y, ...size }, clear: score };
}

// Largeur approchée d'un texte (Inter), pour placer une étiquette sans la mesurer
export function textWidth(text: string, fontSize: number): number {
  return Math.ceil(text.length * fontSize * 0.56);
}

// Jour d'une date (heure locale), pour vibrer à chaque changement de jour
export function dayKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

// Date du point touché : « 12 oct. », avec l'heure sur 1 jour et 1 semaine
// (relevés horaires) : « 12 oct. · 14 h 05 »
export function scrubDateLabel(t: number | string, period: Period, now: Date): string {
  const base = shortDate(t, now);
  if (period !== '1J' && period !== '1S') return base;
  const d = new Date(t);
  return `${base} · ${d.getHours()}\u00a0h\u00a0${String(d.getMinutes()).padStart(2, '0')}`;
}
