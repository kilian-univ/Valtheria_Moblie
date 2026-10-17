// Chiffres réglementaires (taux, plafonds, barèmes) servis par le site :
// GET /regulatory-figures, public et en lecture seule. Les leçons découvertes,
// jouées sans compte, s'en servent au lieu de chiffres écrits en dur.
// Fonctions pures, sans React : testables avec Node.

import { NNBSP } from './frenchSpaces';

export type Figure = { value: string; effectiveAt: string | null; verifiedAt: string | null };
export type Figures = Readonly<Record<string, Figure>>;

// Valeurs de secours : celles de la production au 17/10/2026, utilisées tant
// que la route n'a jamais répondu (première ouverture hors ligne). Seulement
// les clés que l'app cite.
export const FALLBACK_FIGURES: Figures = {
  ir_bareme_taux: { value: '0 % / 11 % / 30 % / 41 % / 45 %', effectiveAt: null, verifiedAt: '2026-09-08' },
  ir_bareme_seuils: { value: '0 € / 11 600 € / 29 579 € / 84 577 € / 181 917 €', effectiveAt: null, verifiedAt: '2026-09-08' },
  inflation_annuelle: { value: '2 %', effectiveAt: null, verifiedAt: null },
  credit_duree_max: { value: '25 ans', effectiveAt: null, verifiedAt: '2026-09-08' },
  crypto_taux_imposition: { value: '31,4 %', effectiveAt: null, verifiedAt: '2026-09-08' },
  crypto_seuil_exoneration: { value: '305 €', effectiveAt: null, verifiedAt: '2026-09-08' },
};

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown): string | null => (typeof v === 'string' && v.trim() !== '' ? v.trim() : null);

// Réponse de la route ({ data: [{ key, value, effective_at, verified_at }] })
// lue une fois ; null si elle est illisible (rien n'est alors remplacé)
export function parseFigures(raw: unknown): Record<string, Figure> | null {
  const rows = isRecord(raw) ? raw.data : raw;
  if (!Array.isArray(rows)) return null;
  const out: Record<string, Figure> = {};
  for (const r of rows) {
    if (!isRecord(r)) continue;
    const key = text(r.key);
    const value = text(r.value);
    if (!key || !value || !/^[a-zA-Z0-9_.]+$/.test(key)) continue;
    out[key] = { value, effectiveAt: text(r.effective_at), verifiedAt: text(r.verified_at) };
  }
  return Object.keys(out).length > 0 ? out : null;
}

// Les valeurs reçues complètent les valeurs de secours, clé par clé
export function withFallback(received: Readonly<Record<string, Figure>> | null): Figures {
  return { ...FALLBACK_FIGURES, ...(received ?? {}) };
}

// Valeur affichée d'une clé (« 31,4 % ») ; à défaut, celle de secours
export function figureValue(figures: Figures, key: string): string {
  return figures[key]?.value ?? FALLBACK_FIGURES[key]?.value ?? '';
}

// Nombres d'une valeur, dans l'ordre : « 0 % / 11 % / 30 % » → [0, 11, 30] ;
// « 11 600 € » → [11600] ; « 25 ans » → [25]
export function figureNumbers(value: string): number[] {
  return value
    .split('/')
    .map((part) => part.replace(/[\s  ]/g, '').match(/-?\d+(?:[.,]\d+)?/)?.[0])
    .filter((n): n is string => !!n)
    .map((n) => Number(n.replace(',', '.')))
    .filter((n) => Number.isFinite(n));
}

// Parties affichées d'une liste : « 0 % / 11 % / 30 % » → ['0 %', '11 %', '30 %']
export function figureParts(value: string): string[] {
  return value.split('/').map((p) => p.trim()).filter((p) => p !== '');
}

// Nombres d'une clé, ou ceux de secours s'ils sont illisibles ou trop peu nombreux
export function numbersOf(figures: Figures, key: string, atLeast = 1): number[] {
  const own = figureNumbers(figureValue(figures, key));
  return own.length >= atLeast ? own : figureNumbers(FALLBACK_FIGURES[key]?.value ?? '');
}

// Entier en euros, milliers séparés par l'espace fine insécable : 28579 → « 28 579 »
export function groupThousands(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, NNBSP);
}

// Remplace les repères {{cle}} d'un texte par la valeur en vigueur (secours
// compris) ; une clé inconnue est retirée plutôt qu'affichée telle quelle
export function fillFigures(input: string, figures: Figures): string {
  if (!input.includes('{{')) return input;
  return input.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (_, key: string) => figureValue(figures, key));
}

// Même remplacement dans toute une structure (écrans d'une leçon)
export function fillFiguresDeep<T>(data: T, figures: Figures): T {
  if (typeof data === 'string') return fillFigures(data, figures) as T;
  if (Array.isArray(data)) return data.map((d) => fillFiguresDeep(d, figures)) as T;
  if (isRecord(data)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data)) out[k] = fillFiguresDeep(v, figures);
    return out as T;
  }
  return data;
}
