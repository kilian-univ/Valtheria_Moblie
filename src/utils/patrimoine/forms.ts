// Formulaires du suivi de patrimoine : dates, et corps des requêtes envoyées
// au site (docs/lot-serveur.md, section 8). Sans React : testable avec Node.

import { parseDecimal } from './preview';
import type { AssetType, Side } from './model';

// ── Dates ────────────────────────────────────────────────────────────────

export const MIN_YEAR = 1990;

export type Day = { y: number; m: number; d: number }; // m : 1 à 12

export const dayOf = (date: Date): Day => ({ y: date.getFullYear(), m: date.getMonth() + 1, d: date.getDate() });
export const isoDay = (day: Day): string => `${day.y}-${String(day.m).padStart(2, '0')}-${String(day.d).padStart(2, '0')}`;
const daysIn = (y: number, m: number) => new Date(y, m, 0).getDate();
const cmp = (a: Day, b: Day) => a.y - b.y || a.m - b.m || a.d - b.d;

// Un cran sur le jour, le mois ou l'année, entre `min` (1990 par défaut) et
// `max` (aujourd'hui pour une opération, plus tard pour une échéance)
export function stepDay(day: Day, field: 'd' | 'm' | 'y', delta: number, max: Day, min: Day = { y: MIN_YEAR, m: 1, d: 1 }): Day {
  let { y, m, d } = day;
  if (field === 'y') y += delta;
  if (field === 'm') {
    m += delta;
    while (m < 1) {
      m += 12;
      y -= 1;
    }
    while (m > 12) {
      m -= 12;
      y += 1;
    }
  }
  if (field === 'd') {
    const t = new Date(y, m - 1, d + delta);
    ({ y, m, d } = dayOf(t));
  }
  d = Math.min(d, daysIn(y, m));
  let next: Day = { y, m, d };
  if (cmp(next, max) > 0) next = max;
  if (cmp(next, min) < 0) next = min;
  return next;
}

export function parseIsoDay(iso: string | null | undefined): Day | null {
  const m = typeof iso === 'string' ? iso.match(/^(\d{4})-(\d{2})-(\d{2})/) : null;
  return m ? { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) } : null;
}

// ── Achat ou vente (POST /api/portfolio/operations) ─────────────────────

export type OperationForm = {
  side: Side;
  ticker: string;
  name: string;
  type: AssetType;
  quantity: string;
  unitPrice: string;
  fees: string;
  currency: string;
  day: Day;
};

export type Payload = { ok: true; body: Record<string, unknown> } | { ok: false; field: string; message: string };

export function operationPayload(form: OperationForm): Payload {
  const quantity = parseDecimal(form.quantity);
  const unitPrice = parseDecimal(form.unitPrice);
  const fees = form.fees.trim() === '' ? 0 : parseDecimal(form.fees);
  if (!form.ticker.trim()) return { ok: false, field: 'ticker', message: 'Choisis un actif.' };
  if (!(quantity > 0)) return { ok: false, field: 'quantity', message: 'Indique une quantité supérieure à 0.' };
  if (!(unitPrice >= 0)) return { ok: false, field: 'unitPrice', message: 'Indique un prix unitaire.' };
  if (!(fees >= 0)) return { ok: false, field: 'fees', message: 'Les frais ne peuvent pas être négatifs.' };
  const type = form.type === 'livret' ? 'autre' : form.type;
  return {
    ok: true,
    body: {
      ticker: form.ticker.trim().toUpperCase(),
      name: form.name.trim() || form.ticker.trim().toUpperCase(),
      type,
      side: form.side,
      quantity,
      unit_price: unitPrice,
      currency: ['EUR', 'USD', 'GBP', 'CHF'].includes(form.currency) ? form.currency : 'EUR',
      fees,
      executed_at: isoDay(form.day),
    },
  };
}

// Modification d'une opération (PATCH) : les mêmes champs, sans l'actif
export function operationPatch(form: OperationForm): Payload {
  const p = operationPayload(form);
  if (!p.ok) return p;
  const { side, quantity, unit_price, currency, fees, executed_at } = p.body;
  return { ok: true, body: { side, quantity, unit_price, currency, fees, executed_at } };
}

// ── Livret (POST ou PATCH /api/portfolio/positions) ─────────────────────

export type LivretForm = { ticker: string | null; name: string; amount: string; ratePct: string };

// Une part au prix du montant, le taux annuel en % dans `rate` (même forme que
// la page web)
export function livretPayload(form: LivretForm, now: number): Payload {
  const amount = parseDecimal(form.amount);
  const rate = form.ratePct.trim() === '' ? null : parseDecimal(form.ratePct);
  if (!form.name.trim()) return { ok: false, field: 'name', message: 'Donne un nom à ce livret.' };
  if (!(amount >= 0)) return { ok: false, field: 'amount', message: 'Indique le montant sur ce livret.' };
  if (rate !== null && !(rate >= 0 && rate <= 100)) return { ok: false, field: 'ratePct', message: 'Le taux est un pourcentage, entre 0 et 100.' };
  return {
    ok: true,
    body: {
      ticker: (form.ticker ?? `LIVRET_${now}`).toUpperCase(),
      name: form.name.trim(),
      type: 'livret',
      quantity: 1,
      buy_price: amount,
      buy_currency: 'EUR',
      is_livret: true,
      ...(rate !== null ? { rate } : {}),
    },
  };
}

// ── Bien estimé à la main : immobilier, objet de valeur ─────────────────

export type ManualKind = 'immobilier' | 'objet' | 'autre';
export const MANUAL_KINDS: readonly { key: ManualKind; label: string }[] = [
  { key: 'immobilier', label: 'Immobilier' },
  { key: 'objet', label: 'Objet de valeur' },
  { key: 'autre', label: 'Autre bien' },
];

export type ManualForm = { name: string; value: string; paid: string };

// Valeur estimée (mise à jour à la main) ; montant payé facultatif (sinon la valeur)
export function manualPayload(form: ManualForm, kind: ManualKind, now: number): Payload {
  const value = parseDecimal(form.value);
  const paid = form.paid.trim() === '' ? value : parseDecimal(form.paid);
  if (!form.name.trim()) return { ok: false, field: 'name', message: 'Donne un nom à ce bien.' };
  if (!(value >= 0)) return { ok: false, field: 'value', message: 'Indique sa valeur estimée.' };
  if (!(paid >= 0)) return { ok: false, field: 'paid', message: 'Indique le montant payé, ou laisse vide.' };
  return {
    ok: true,
    body: {
      ticker: `CUSTOM_${kind.toUpperCase()}_${now}`,
      name: form.name.trim(),
      type: 'autre',
      quantity: 1,
      buy_price: paid,
      buy_currency: 'EUR',
      is_manual: true,
      current_value_override: value,
    },
  };
}

// Mise à jour d'un bien déjà suivi : nom et valeur estimée
export function manualPatch(form: ManualForm): Payload {
  const value = parseDecimal(form.value);
  if (!form.name.trim()) return { ok: false, field: 'name', message: 'Donne un nom à ce bien.' };
  if (!(value >= 0)) return { ok: false, field: 'value', message: 'Indique sa valeur estimée.' };
  return { ok: true, body: { name: form.name.trim(), current_value_override: value } };
}

// Versement sur un livret (pour la régularité) : la hausse du montant
export function livretDeposit(before: number | null, after: number): number {
  return before === null ? after : Math.max(0, after - before);
}
