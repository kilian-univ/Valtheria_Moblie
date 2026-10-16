// Aperçu d'une opération avant enregistrement (« APRÈS CET ACHAT »,
// « APRÈS CETTE VENTE »), calculé comme le serveur (PositionLedger du site) :
// prix de revient moyen pondéré, frais compris ; une vente ne change pas le
// prix de revient ; plus-value = quantité × prix − frais − quantité × prix de
// revient. Sans React : testable avec Node.

import type { Side } from './model';

export const QUANTITY_EPSILON = 1e-8;

export type Holding = { quantity: number; avgCost: number };

export type OperationInput = { side: Side; quantity: number; unitPrice: number; fees: number };

export type BuyPreview = {
  side: 'buy';
  quantityBefore: number;
  quantityAfter: number;
  avgCostBefore: number;
  avgCostAfter: number;
  investedBefore: number;
  investedAfter: number;
  total: number; // montant de l'achat, frais compris
};

export type SellPreview = {
  side: 'sell';
  quantityBefore: number;
  quantityAfter: number;
  avgCost: number;
  realizedGain: number;
  proceeds: number; // montant reçu, frais déduits
  closes: boolean; // la position est soldée
};

export type PreviewResult =
  | { ok: true; preview: BuyPreview | SellPreview }
  | { ok: false; reason: 'quantity' | 'price' | 'not_held' | 'too_much'; message: string };

export function formatQuantityPlain(q: number): string {
  return String(Math.round(q * 1e8) / 1e8).replace('.', ',');
}

export function previewOperation(holding: Holding | null, input: OperationInput): PreviewResult {
  const held = holding?.quantity ?? 0;
  const avg = holding?.avgCost ?? 0;
  const { side, quantity: q, unitPrice: price } = input;
  const fees = Math.max(0, input.fees || 0);

  if (!Number.isFinite(q) || q <= 0) return { ok: false, reason: 'quantity', message: 'Indique une quantité supérieure à 0.' };
  if (!Number.isFinite(price) || price < 0) return { ok: false, reason: 'price', message: 'Indique un prix unitaire.' };

  if (side === 'buy') {
    const costBefore = held * avg;
    const costAfter = costBefore + q * price + fees;
    const quantityAfter = held + q;
    return {
      ok: true,
      preview: {
        side: 'buy',
        quantityBefore: held,
        quantityAfter,
        avgCostBefore: avg,
        avgCostAfter: costAfter / quantityAfter,
        investedBefore: costBefore,
        investedAfter: costAfter,
        total: q * price + fees,
      },
    };
  }

  if (held <= QUANTITY_EPSILON) {
    return { ok: false, reason: 'not_held', message: 'Tu ne détiens pas encore cet actif : commence par noter un achat.' };
  }
  if (q > held + QUANTITY_EPSILON) {
    return {
      ok: false,
      reason: 'too_much',
      message: `Tu ne peux pas vendre plus que ce que tu détiens (${formatQuantityPlain(held)}).`,
    };
  }
  const quantityAfter = Math.max(0, held - q);
  return {
    ok: true,
    preview: {
      side: 'sell',
      quantityBefore: held,
      quantityAfter: quantityAfter <= QUANTITY_EPSILON ? 0 : quantityAfter,
      avgCost: avg,
      realizedGain: q * price - fees - q * avg,
      proceeds: q * price - fees,
      closes: quantityAfter <= QUANTITY_EPSILON,
    },
  };
}

// « 12,5 » ou « 12.5 » ou « 1 200 » → 1200 ; vide ou illisible → NaN
export function parseDecimal(text: string): number {
  const cleaned = text.replace(/[\s  ]/g, '').replace(',', '.');
  if (cleaned === '' || !/^-?\d*\.?\d*$/.test(cleaned)) return NaN;
  return Number(cleaned);
}
