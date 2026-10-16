// Points de la courbe « Évolution » du portefeuille, sans React : testable
// avec Node.
//
// GET /api/portfolio/history répond { data: [...], range, total_invested,
// current_value }, mais la couche API de l'app déplie toute réponse qui a une
// clé `data` : l'écran reçoit le tableau seul. Les deux formes sont acceptées,
// et l'investi vient de GET /api/portfolio (total_invested_eur).

export type HistoryPoint = { date: string; value: number; is_snapshot: boolean };

function toPoint(raw: unknown): HistoryPoint | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const value = typeof r.value === 'number' ? r.value : Number(r.value);
  if (typeof r.date !== 'string' || !Number.isFinite(value)) return null;
  return { date: r.date, value, is_snapshot: r.is_snapshot === true };
}

export function historyPoints(raw: unknown): HistoryPoint[] {
  const list = Array.isArray(raw)
    ? raw
    : raw && typeof raw === 'object' && Array.isArray((raw as { data?: unknown }).data)
      ? (raw as { data: unknown[] }).data
      : [];
  return list.map(toPoint).filter((p): p is HistoryPoint => p !== null);
}

// Bornes de l'axe vertical : la ligne de l'investi reste toujours visible
export function historyBounds(values: readonly number[], invested: number | null): { min: number; max: number } {
  const all = invested !== null && Number.isFinite(invested) && invested > 0 ? [...values, invested] : [...values];
  if (all.length === 0) return { min: 0, max: 1 };
  return { min: Math.min(...all), max: Math.max(...all) };
}
