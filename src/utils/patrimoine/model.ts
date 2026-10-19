// Suivi de patrimoine : forme des réponses du lot portefeuille du site
// (docs/lot-serveur.md, section 8), lue prudemment. Sans React : testable
// avec Node.
//
// Tant que le lot n'est pas en production, GET /api/portfolio répond à
// l'ancienne forme (sans `closed_positions` ni `avg_cost`) : `supportsLedger`
// le dit, et l'app garde alors l'écran actuel du portefeuille.

export type AssetType = 'crypto' | 'action' | 'etf' | 'livret' | 'matiere' | 'autre';
export type RiskLevel = 'sans_risque' | 'modere' | 'eleve' | 'tres_eleve';
export type Side = 'buy' | 'sell';

export const ASSET_TYPES: readonly AssetType[] = ['crypto', 'action', 'etf', 'livret', 'matiere', 'autre'];
export const RISK_LEVELS: readonly RiskLevel[] = ['sans_risque', 'modere', 'eleve', 'tres_eleve'];

export type Position = {
  id: number;
  ticker: string;
  name: string;
  type: AssetType;
  logoUrl: string | null;
  risk: RiskLevel | null;
  quantity: number;
  currency: string; // devise de la position (buy_currency)
  avgCost: number;
  currentPrice: number;
  invested: number; // devise de la position
  value: number; // devise de la position
  gain: number; // plus-value latente, devise de la position
  gainPct: number;
  valueEur: number | null;
  investedEur: number | null;
  dailyChangePct: number;
  isLive: boolean;
  priceSource: string | null;
  priceUpdatedAt: string | null;
  realizedGain: number;
  realizedGainEur: number;
  operationsCount: number;
  openedAt: string | null;
  isLivret: boolean;
  isManual: boolean;
  interestEur: number | null; // intérêts estimés sur l'année (livrets)
  // Taux d'un livret, toujours celui du serveur : chiffre réglementaire
  // (« regulatory », avec sa date d'effet et de vérification) ou taux saisi
  // d'un livret bancaire libre (« position »)
  interestRatePct: number | null;
  interestRateSource: 'regulatory' | 'position' | null;
  interestRateEffectiveAt: string | null;
  interestRateVerifiedAt: string | null;
};

export type ClosedPosition = {
  id: number;
  ticker: string;
  name: string;
  type: AssetType;
  logoUrl: string | null;
  currency: string;
  avgCost: number;
  realizedGain: number;
  realizedGainEur: number;
  closedAt: string | null;
};

export type Portfolio = {
  totalEur: number;
  investedEur: number;
  gainEur: number;
  gainPct: number;
  dailyChangePct: number;
  realizedGainEur: number;
  netInvestedEur: number;
  passiveIncomeEur: number;
  positions: Position[];
  closed: ClosedPosition[];
  // Dollars pour un euro (taux du jour du serveur), pour convertir en euros
  eurUsd: number | null;
};

export type Operation = {
  id: number;
  positionId: number;
  side: Side;
  quantity: number;
  unitPrice: number;
  currency: string;
  fees: number;
  total: number;
  executedAt: string;
  note: string | null;
  costBasis: number | null;
  realizedGain: number | null;
  ticker: string | null;
};

// id : celui de l'instantané (DELETE /api/portfolio/snapshots/{id}) ; null pour
// un point calculé à la volée, ou un serveur qui ne le donne pas encore
export type ChartPoint = { id: number | null; date: string; value: number; invested: number; isSnapshot: boolean };

const num = (v: unknown, fallback = 0): number => {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
  return Number.isFinite(n) ? n : fallback;
};
const numOrNull = (v: unknown): number | null => {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
};
const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() !== '' ? v : null);
const obj = (v: unknown): Record<string, unknown> | null =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;

function assetType(v: unknown): AssetType {
  return ASSET_TYPES.includes(v as AssetType) ? (v as AssetType) : 'autre';
}
function risk(v: unknown): RiskLevel | null {
  return RISK_LEVELS.includes(v as RiskLevel) ? (v as RiskLevel) : null;
}

// Le serveur répond-il au format du lot portefeuille ?
export function supportsLedger(raw: unknown): boolean {
  const r = obj(raw);
  if (!r || !Array.isArray(r.closed_positions) || !Array.isArray(r.positions)) return false;
  return r.positions.every((p) => obj(p) !== null && 'avg_cost' in (p as object));
}

export function parsePosition(raw: unknown): Position | null {
  const p = obj(raw);
  if (!p || typeof p.id !== 'number') return null;
  const isLivret = p.is_livret === true || p.type === 'livret';
  return {
    id: p.id,
    ticker: str(p.ticker) ?? '',
    name: str(p.name) ?? str(p.ticker) ?? '',
    type: assetType(p.type),
    logoUrl: str(p.logo_url),
    risk: risk(p.risk_level),
    quantity: num(p.quantity),
    currency: str(p.buy_currency) ?? 'EUR',
    avgCost: num(p.avg_cost ?? p.buy_price),
    currentPrice: num(p.current_price),
    invested: num(p.invested),
    value: num(p.value),
    gain: num(p.gain_loss),
    gainPct: num(p.gain_loss_pct),
    valueEur: numOrNull(p.value_eur),
    investedEur: numOrNull(p.invested_eur),
    dailyChangePct: num(p.daily_change_pct),
    isLive: p.is_live === true,
    priceSource: str(p.price_source),
    priceUpdatedAt: str(p.price_updated_at),
    realizedGain: num(p.realized_gain),
    realizedGainEur: num(p.realized_gain_eur),
    operationsCount: num(p.operations_count),
    openedAt: str(p.opened_at) ?? str(p.buy_date),
    isLivret,
    isManual: p.is_manual === true,
    interestEur: numOrNull(p.annual_interest_estimate_eur),
    interestRatePct: numOrNull(p.interest_rate_pct),
    interestRateSource: p.interest_rate_source === 'regulatory' || p.interest_rate_source === 'position' ? p.interest_rate_source : null,
    interestRateEffectiveAt: str(p.interest_rate_effective_at),
    interestRateVerifiedAt: str(p.interest_rate_verified_at),
  };
}

export function parseClosed(raw: unknown): ClosedPosition | null {
  const p = obj(raw);
  if (!p || typeof p.id !== 'number') return null;
  return {
    id: p.id,
    ticker: str(p.ticker) ?? '',
    name: str(p.name) ?? str(p.ticker) ?? '',
    type: assetType(p.type),
    logoUrl: str(p.logo_url),
    currency: str(p.buy_currency) ?? 'EUR',
    avgCost: num(p.avg_cost),
    realizedGain: num(p.realized_gain),
    realizedGainEur: num(p.realized_gain_eur),
    closedAt: str(p.closed_at),
  };
}

// Valeur d'une position en euros (repli : sa valeur en devise si le taux manque)
export const valueEurOf = (p: Position): number => p.valueEur ?? p.value;

export function parsePortfolio(raw: unknown): Portfolio | null {
  const r = obj(raw);
  if (!r) return null;
  const positions = (Array.isArray(r.positions) ? r.positions : [])
    .map(parsePosition)
    .filter((p): p is Position => p !== null)
    .sort((a, b) => valueEurOf(b) - valueEurOf(a));
  const closed = (Array.isArray(r.closed_positions) ? r.closed_positions : [])
    .map(parseClosed)
    .filter((p): p is ClosedPosition => p !== null);
  return {
    totalEur: num(r.total_current_eur ?? r.total_current),
    investedEur: num(r.total_invested_eur ?? r.total_invested),
    gainEur: num(r.unrealized_gain_eur ?? r.gain_loss),
    gainPct: num(r.gain_loss_pct),
    dailyChangePct: num(r.daily_change_pct),
    realizedGainEur: num(r.realized_gain_total_eur),
    netInvestedEur: num(r.net_invested_eur ?? r.total_invested_eur),
    passiveIncomeEur: num(r.passive_income_estimate_eur),
    positions,
    closed,
    eurUsd: numOrNull(obj(r.fx)?.eur_usd ?? r.eur_usd_rate),
  };
}

export function parseOperation(raw: unknown): Operation | null {
  const o = obj(raw);
  if (!o || typeof o.id !== 'number' || (o.side !== 'buy' && o.side !== 'sell')) return null;
  const executedAt = str(o.executed_at);
  if (!executedAt) return null;
  return {
    id: o.id,
    positionId: num(o.position_id),
    side: o.side,
    quantity: num(o.quantity),
    unitPrice: num(o.unit_price),
    currency: str(o.currency) ?? 'EUR',
    fees: num(o.fees),
    total: num(o.total),
    executedAt,
    note: str(o.note),
    costBasis: numOrNull(o.cost_basis),
    realizedGain: numOrNull(o.realized_gain),
    ticker: str(o.ticker),
  };
}

export function parseOperations(raw: unknown): Operation[] {
  const list = Array.isArray(raw) ? raw : (obj(raw)?.operations as unknown);
  return (Array.isArray(list) ? list : []).map(parseOperation).filter((o): o is Operation => o !== null);
}

// GET /api/portfolio/chart : { points } ; accepte aussi la forme de /history
// ({ data }) ou un tableau déjà déplié par la couche API.
export function parseChart(raw: unknown): ChartPoint[] {
  const r = obj(raw);
  const list = Array.isArray(raw) ? raw : Array.isArray(r?.points) ? r!.points : Array.isArray(r?.data) ? r!.data : [];
  return (list as unknown[])
    .map((x) => {
      const p = obj(x);
      if (!p || typeof p.date !== 'string') return null;
      const value = numOrNull(p.value);
      if (value === null) return null;
      return { id: typeof p.id === 'number' ? p.id : null, date: p.date, value, invested: num(p.invested, value), isSnapshot: p.is_snapshot === true };
    })
    .filter((p): p is ChartPoint => p !== null)
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
}

// Cours d'un actif : GET /api/prices/history → { series: [{t, p}], currency }
export type PricePoint = { t: number; price: number };
export function parsePriceHistory(raw: unknown): { points: PricePoint[]; currency: string } {
  const r = obj(raw);
  const series = Array.isArray(r?.series) ? (r!.series as unknown[]) : [];
  const points = series
    .map((x) => {
      const p = obj(x);
      const t = numOrNull(p?.t);
      const price = numOrNull(p?.p ?? p?.c);
      return t !== null && price !== null ? { t: t * 1000, price } : null;
    })
    .filter((p): p is PricePoint => p !== null)
    .sort((a, b) => a.t - b.t);
  return { points, currency: str(r?.currency) ?? 'EUR' };
}

// Cours figé : la source ne répond pas, le dernier cours gardé est servi
export function isStalePrice(p: Position): boolean {
  if (p.isLivret || p.isManual) return false;
  return p.priceSource === 'stored' || p.priceSource === 'buy_price';
}
