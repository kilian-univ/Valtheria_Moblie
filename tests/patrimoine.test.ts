/// <reference types="node" />
// Lancer : npm test
// Suivi de patrimoine : lecture des réponses, aperçus, courbes, répartition,
// remarque de Val (src/utils/patrimoine/*)

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { byRisk, byType, riskProfile, riskyShare, roundedShares } from '../src/utils/patrimoine/analysis';
import {
  chartSummary,
  clipPoints,
  depositIndexes,
  makeScale,
  modeValue,
  operationMarks,
  periodStart,
  portfolioRange,
  priceRange,
  variation,
} from '../src/utils/patrimoine/chart';
import { initials, money, quantity, quantityLabel, signedMoney, updatedLabel } from '../src/utils/patrimoine/format';
import {
  isStalePrice,
  parseChart,
  parseOperations,
  parsePortfolio,
  parsePriceHistory,
  supportsLedger,
  type Position,
} from '../src/utils/patrimoine/model';
import { positionPayload } from '../src/utils/patrimoine/legacyPayload';
import { parseDecimal, previewOperation } from '../src/utils/patrimoine/preview';
import { chooseValTip, FORBIDDEN_ADVICE } from '../src/utils/patrimoine/valTips';

// Réponse de GET /api/portfolio au format du lot portefeuille (docs/lot-serveur.md)
const LEDGER = {
  id: 1,
  total_current_eur: 6371.04,
  total_invested_eur: 6460,
  gain_loss: -88.96,
  gain_loss_pct: -1.38,
  daily_change_pct: -0.1,
  unrealized_gain_eur: -88.96,
  realized_gain_total_eur: 88.5,
  net_invested_eur: 6371.5,
  passive_income_estimate_eur: 144,
  positions: [
    { id: 1, ticker: 'SOL', name: 'Solana', type: 'crypto', logo_url: null, risk_level: 'tres_eleve', quantity: 4, buy_currency: 'EUR',
      buy_price: 115, avg_cost: 115, current_price: 92.76, invested: 460, value: 371.04, gain_loss: -88.96, gain_loss_pct: -19.34,
      value_eur: 371.04, invested_eur: 460, is_live: true, price_source: 'coingecko', price_updated_at: '2026-10-16T21:19:32+00:00',
      realized_gain: 88.5, realized_gain_eur: 88.5, operations_count: 4, opened_at: '2026-08-01T00:00:00+00:00', is_livret: false, is_manual: false },
    { id: 3, ticker: 'LIVRET_A', name: 'Livret A', type: 'livret', logo_url: null, risk_level: 'sans_risque', quantity: 1, buy_currency: 'EUR',
      buy_price: 6000, avg_cost: 6000, current_price: 6000, invested: 6000, value: 6000, gain_loss: 0, gain_loss_pct: 0, value_eur: 6000,
      invested_eur: 6000, is_live: false, price_source: 'livret', operations_count: 0, is_livret: true, is_manual: false, rate: 2.4,
      annual_interest_estimate_eur: 144, interest_rate_pct: 2.4 },
  ],
  closed_positions: [
    { id: 7, ticker: 'AAPL', name: 'Apple Inc.', type: 'action', buy_currency: 'USD', avg_cost: 180.5, realized_gain: 41.2, realized_gain_eur: 36.63, closed_at: '2026-09-30T00:00:00+00:00' },
  ],
};

// Réponse de l'ancien serveur (en production tant que le lot n'est pas déployé)
const LEGACY = { id: 1, total_current_eur: 100, positions: [{ id: 1, ticker: 'SOL', buy_price: 100, quantity: 1, value: 100 }] };

test('le format du lot portefeuille est reconnu, l’ancien non', () => {
  assert.equal(supportsLedger(LEDGER), true);
  assert.equal(supportsLedger(LEGACY), false);
  assert.equal(supportsLedger(null), false);
  assert.equal(supportsLedger({ positions: [], closed_positions: [] }), true);
});

test('lecture du portefeuille : positions triées par valeur, positions soldées à part', () => {
  const p = parsePortfolio(LEDGER)!;
  assert.deepEqual(p.positions.map((x) => x.ticker), ['LIVRET_A', 'SOL']);
  assert.equal(p.positions[1].avgCost, 115);
  assert.equal(p.positions[1].risk, 'tres_eleve');
  assert.equal(p.positions[0].interestEur, 144);
  assert.equal(p.passiveIncomeEur, 144);
  assert.equal(p.closed.length, 1);
  assert.equal(p.closed[0].realizedGainEur, 36.63);
});

test('cours figé signalé', () => {
  const p = parsePortfolio(LEDGER)!;
  const sol = p.positions.find((x) => x.ticker === 'SOL')!;
  assert.equal(isStalePrice(sol), false);
  assert.equal(isStalePrice({ ...sol, priceSource: 'stored' }), true);
  assert.equal(isStalePrice(p.positions[0]), false, 'un livret n’a pas de cours');
});

test('opérations, courbe et cours : formes acceptées', () => {
  const ops = parseOperations({ operations: [{ id: 4, position_id: 1, side: 'sell', quantity: 2, unit_price: 160, fees: 1.5, executed_at: '2026-10-14T00:00:00+00:00', realized_gain: 88.5 }, { id: 5, side: 'gift' }], pagination: {} });
  assert.equal(ops.length, 1);
  assert.equal(ops[0].realizedGain, 88.5);

  const pts = [{ date: '2026-10-02', value: 10, invested: 8, is_snapshot: true }, { date: '2026-10-01', value: 9 }];
  assert.deepEqual(parseChart({ points: pts }).map((p) => p.date), ['2026-10-01', '2026-10-02']);
  assert.equal(parseChart({ data: pts }).length, 2, 'forme de /history');
  assert.equal(parseChart(pts).length, 2, 'tableau déplié');
  assert.equal(parseChart({ points: pts })[0].invested, 9, 'sans investi : la valeur');

  const h = parsePriceHistory({ series: [{ t: 2, p: 5 }, { t: 1, p: 4 }], currency: 'USD' });
  assert.deepEqual(h.points, [{ t: 1000, price: 4 }, { t: 2000, price: 5 }]);
});

// ── Aperçus ─────────────────────────────────────────────────────────────

test('aperçu d’un achat : prix de revient moyen pondéré, frais compris', () => {
  const r = previewOperation({ quantity: 3, avgCost: 130 }, { side: 'buy', quantity: 2, unitPrice: 160, fees: 0 });
  assert.equal(r.ok, true);
  if (!r.ok || r.preview.side !== 'buy') return;
  assert.equal(r.preview.quantityAfter, 5);
  assert.equal(r.preview.avgCostAfter, 142); // (390 + 320) / 5
  assert.equal(r.preview.investedBefore, 390);
  assert.equal(r.preview.investedAfter, 710);
  assert.equal(r.preview.total, 320);

  const withFees = previewOperation(null, { side: 'buy', quantity: 2, unitPrice: 100, fees: 4 });
  assert.ok(withFees.ok && withFees.preview.side === 'buy' && withFees.preview.avgCostAfter === 102);
});

test('aperçu d’une vente : plus-value réalisée, prix de revient inchangé', () => {
  const r = previewOperation({ quantity: 5, avgCost: 120 }, { side: 'sell', quantity: 2, unitPrice: 180, fees: 4 });
  assert.ok(r.ok && r.preview.side === 'sell');
  if (!r.ok || r.preview.side !== 'sell') return;
  assert.equal(r.preview.quantityAfter, 3);
  assert.equal(r.preview.avgCost, 120);
  assert.equal(r.preview.realizedGain, 116); // 360 − 4 − 240
  assert.equal(r.preview.closes, false);

  const all = previewOperation({ quantity: 1, avgCost: 100 }, { side: 'sell', quantity: 1, unitPrice: 70, fees: 0 });
  assert.ok(all.ok && all.preview.side === 'sell' && all.preview.closes && all.preview.realizedGain === -30);
});

test('vente refusée au-delà de la quantité détenue, avec un message clair', () => {
  const r = previewOperation({ quantity: 2, avgCost: 100 }, { side: 'sell', quantity: 3, unitPrice: 100, fees: 0 });
  assert.equal(r.ok, false);
  assert.ok(!r.ok && r.reason === 'too_much' && r.message.includes('plus que ce que tu détiens (2)'));

  const none = previewOperation(null, { side: 'sell', quantity: 1, unitPrice: 100, fees: 0 });
  assert.ok(!none.ok && none.reason === 'not_held');

  assert.ok(!previewOperation(null, { side: 'buy', quantity: 0, unitPrice: 1, fees: 0 }).ok);
  assert.ok(!previewOperation(null, { side: 'buy', quantity: 1, unitPrice: NaN, fees: 0 }).ok);
  // Vendre exactement ce qu'on a, malgré l'arrondi
  assert.ok(previewOperation({ quantity: 0.3, avgCost: 1 }, { side: 'sell', quantity: 0.1 + 0.2, unitPrice: 1, fees: 0 }).ok);
});

test('saisie des nombres à la française', () => {
  assert.equal(parseDecimal('12,5'), 12.5);
  assert.equal(parseDecimal('1 200'), 1200);
  assert.ok(Number.isNaN(parseDecimal('')));
  assert.ok(Number.isNaN(parseDecimal('12a')));
});

// ── Courbes ─────────────────────────────────────────────────────────────

const NOW = new Date('2026-10-16T12:00:00Z');
const SERIES = [
  { date: '2025-06-01T00:00:00Z', value: 1000, invested: 1000, isSnapshot: true },
  { date: '2026-02-01T00:00:00Z', value: 2100, invested: 2000, isSnapshot: true },
  { date: '2026-09-01T00:00:00Z', value: 2300, invested: 2000, isSnapshot: true },
  { date: '2026-10-15T00:00:00Z', value: 3500, invested: 3000, isSnapshot: true },
];

test('périodes : plages du serveur et découpe sur le téléphone', () => {
  assert.equal(portfolioRange('YTD'), '1y');
  assert.equal(portfolioRange('5A'), 'max');
  assert.equal(priceRange('1J'), '1W');
  assert.equal(periodStart('YTD', NOW), new Date(2026, 0, 1).getTime());
  assert.equal(periodStart('Tout', NOW), null);
  assert.equal(clipPoints(SERIES, 'YTD', NOW).length, 3);
  assert.equal(clipPoints(SERIES, '1M', NOW).length, 1);
  assert.equal(clipPoints(SERIES, 'Tout', NOW).length, 4);
});

test('modes, versements et variation', () => {
  assert.equal(modeValue(SERIES[1], 'plus-value'), 100);
  assert.equal(modeValue(SERIES[1], 'performance'), 5);
  assert.equal(modeValue({ ...SERIES[1], invested: 0 }, 'performance'), null);
  assert.deepEqual(depositIndexes(SERIES), [1, 3]);
  assert.deepEqual(variation(SERIES), { from: 1000, to: 3500, delta: 2500, pct: 250 });
  assert.equal(variation(SERIES.slice(0, 1)), null);
});

test('toucher-glisser : l’indice du point le plus proche', () => {
  const s = makeScale([1, 2, 3, 4], 4, { width: 300, height: 100, padTop: 0, padBottom: 0 });
  assert.equal(s.index(0), 0);
  assert.equal(s.index(140), 1);
  assert.equal(s.index(160), 2);
  assert.equal(s.index(999), 3);
  assert.equal(s.y(4), 0);
  assert.equal(s.y(1), 100);
});

test('achats et ventes placés sur la courbe du cours', () => {
  const day = 86_400_000;
  const pts = [0, 1, 2, 3].map((i) => ({ t: Date.parse('2026-10-01') + i * day, price: 100 + i }));
  const marks = operationMarks(pts, parseOperations([
    { id: 1, side: 'buy', quantity: 1, unit_price: 100, executed_at: '2026-10-02T09:00:00Z' },
    { id: 2, side: 'sell', quantity: 1, unit_price: 100, executed_at: '2026-10-04T00:00:00Z' },
    { id: 3, side: 'buy', quantity: 1, unit_price: 100, executed_at: '2025-01-01T00:00:00Z' },
  ]));
  assert.deepEqual(marks, [{ index: 1, side: 'buy', operationId: 1 }, { index: 3, side: 'sell', operationId: 2 }]);
});

test('phrase lue par VoiceOver', () => {
  const m = (v: number) => money(v);
  assert.equal(chartSummary(SERIES, 'Tout', m), 'Ton patrimoine est passé de 1 000 € à 3 500 € depuis le début.');
  assert.ok(chartSummary(SERIES.slice(0, 1), '1A', m).includes('pas encore assez'));
});

// ── Format ──────────────────────────────────────────────────────────────

test('montants, mode discret, quantités, initiales', () => {
  assert.equal(money(48320), '48 320 €');
  assert.equal(money(805.4), '805 €');
  assert.equal(money(805.4, { exact: true }), '805,40 €');
  assert.equal(money(12.4), '12,40 €');
  assert.equal(money(48320, { hidden: true }), '••••• €');
  assert.equal(signedMoney(6320), '+ 6 320 €');
  assert.equal(signedMoney(-95), '− 95,00 €');
  assert.equal(signedMoney(410), '+ 410 €');
  assert.equal(quantity(0.0012), '0,0012');
  assert.equal(quantityLabel(5, 'SOL', 'crypto'), '5 SOL');
  assert.equal(quantityLabel(42, 'CW8.PA', 'etf'), '42 parts');
  assert.equal(initials('Solana', 'SOL'), 'SO');
  assert.equal(initials('Livret A', 'LIVRET_A'), 'LA');
  assert.equal(initials('Appartement (part)', ''), 'AP');
  const now = Date.parse('2026-10-16T12:00:00Z');
  assert.equal(updatedLabel(now - 3 * 60_000, now), 'Mis à jour il y a 3 min');
  assert.equal(updatedLabel(now - 10_000, now), "Mis à jour à l'instant");
});

// ── Répartition et profil de risque ────────────────────────────────────

function pos(type: Position['type'], value: number, extra: Partial<Position> = {}): Position {
  return {
    id: Math.round(value), ticker: type.toUpperCase(), name: type, type, logoUrl: null, risk: null, quantity: 1, currency: 'EUR',
    avgCost: value, currentPrice: value, invested: value, value, gain: 0, gainPct: 0, valueEur: value, investedEur: value,
    dailyChangePct: 0, isLive: true, priceSource: 'coingecko', priceUpdatedAt: null, realizedGain: 0, realizedGainEur: 0,
    operationsCount: 1, openedAt: null, isLivret: type === 'livret', isManual: false, interestEur: null, interestRatePct: null, ...extra,
  };
}

test('répartition par type et par risque', () => {
  const list = [pos('etf', 450), pos('livret', 250), pos('crypto', 200), pos('autre', 100)];
  assert.deepEqual(byType(list).map((s) => [s.key, s.share]), [['actions', 0.45], ['epargne', 0.25], ['crypto', 0.2], ['autres', 0.1]]);
  assert.deepEqual(byRisk(list).map((s) => s.key), ['sans_risque', 'modere', 'tres_eleve', 'non_classe']);
  assert.deepEqual(roundedShares(byType([pos('etf', 1), pos('livret', 1), pos('crypto', 1)])).map((s) => s.percent).reduce((a, b) => a + b), 100);
});

test('profil de risque selon la part à risque élevé et très élevé', () => {
  assert.equal(riskProfile([pos('livret', 900), pos('crypto', 100)]), 'Prudent'); // 10 %
  assert.equal(riskProfile([pos('etf', 450), pos('livret', 250), pos('action', 200), pos('crypto', 100)]), 'Équilibré'); // 30 %
  assert.equal(riskProfile([pos('etf', 400), pos('action', 600)]), 'Dynamique'); // 60 %
  assert.equal(riskProfile([pos('crypto', 800), pos('livret', 200)]), 'Audacieux'); // 80 %
  assert.equal(riskProfile([]), null);
  assert.equal(riskyShare([pos('etf', 100, { risk: 'eleve' })]), 1, 'le risque du serveur passe avant le type');
});

// ── Remarque de Val ────────────────────────────────────────────────────

test('remarque de Val : une seule, par priorité, toujours avec une leçon', () => {
  const ctx = (positions: Position[], monthlyExpenses: number | null = null) => chooseValTip({ positions, now: NOW, monthlyExpenses });
  assert.equal(ctx([pos('etf', 500), pos('crypto', 300)])!.key, 'no_emergency');
  assert.equal(ctx([pos('livret', 500), pos('etf', 1000)], 800)!.key, 'emergency_low');
  assert.equal(ctx([pos('livret', 500), pos('etf', 400, { name: 'ETF Monde' }), pos('action', 100)])!.key, 'concentration');
  assert.equal(ctx([pos('livret', 500), pos('etf', 250), pos('action', 200), pos('crypto', 400, { id: 9 }), pos('matiere', 230)])!.key, 'crypto_heavy');
  assert.equal(ctx([pos('livret', 500, { openedAt: '2025-01-01T00:00:00Z' })])!.key, 'all_safe_long');
  assert.equal(ctx([pos('livret', 500, { openedAt: '2026-09-01T00:00:00Z' })])!.key, 'regular');
  assert.equal(ctx([]), null);

  const concentration = ctx([pos('livret', 500), pos('etf', 400, { name: 'ETF Monde' }), pos('action', 100)])!;
  assert.ok(concentration.text.includes('ETF Monde pèse 40 %'));
  for (const list of [[pos('etf', 1)], [pos('crypto', 5), pos('livret', 1)], [pos('livret', 1, { openedAt: '2020-01-01' })]]) {
    const tip = ctx(list)!;
    assert.ok(tip.link.universe && tip.link.keywords.length > 0, 'chaque remarque mène à une leçon');
    assert.ok(!FORBIDDEN_ADVICE.test(tip.text), `pas de conseil d’achat ou de vente : ${tip.text}`);
  }
});

// ── Formulaire actuel (repli) : le livret ─────────────────────────────

test('livret : le montant part en prix, le taux dans rate (et plus en prix)', () => {
  assert.deepEqual(positionPayload({ type: 'livret', ticker: 'livret_a', name: 'Livret A', first: '5 000', second: '2,4', currency: 'USD' }), {
    ticker: 'LIVRET_A', name: 'Livret A', type: 'livret', quantity: 1, buy_price: 5000, buy_currency: 'EUR', is_livret: true, rate: 2.4,
  });
  assert.equal('rate' in positionPayload({ type: 'livret', ticker: 'L', name: 'L', first: '100', second: '', currency: 'EUR' }), false);
  assert.deepEqual(positionPayload({ type: 'crypto', ticker: 'sol', name: 'Solana', first: '2', second: '150,5', currency: 'USD' }), {
    ticker: 'SOL', name: 'Solana', type: 'crypto', quantity: 2, buy_price: 150.5, buy_currency: 'USD',
  });
});

// ── Lien vers la leçon ─────────────────────────────────────────────────

test('le lien de Val mène au module concerné, sinon à l’univers, sinon à Apprendre', async () => {
  const { lessonHref } = await import('../src/utils/patrimoine/lessonLink');
  const modules = [{ id: 100, title: 'Ton coussin de sécurité' }, { id: 101, title: 'Choisir son horizon' }, { id: 200, title: 'Diversifier sans se ruiner' }];
  const universes = [{ id: 1, slug: 'avant-d-investir', moduleIds: [100, 101] }, { id: 2, slug: 'bourse', moduleIds: [200] }];
  const tip = (universe: string, keywords: string[]) => ({ universe, keywords, label: '' });
  assert.deepEqual(lessonHref(tip('avant-d-investir', ['securite']), modules, universes), { pathname: '/apprendre/module/[moduleId]', params: { moduleId: '100' } });
  assert.deepEqual(lessonHref(tip('bourse', ['diversif']), modules, universes), { pathname: '/apprendre/module/[moduleId]', params: { moduleId: '200' } });
  assert.deepEqual(lessonHref(tip('bourse', ['inconnu']), modules, universes), { pathname: '/apprendre/univers/[universeId]', params: { universeId: '2' } });
  assert.deepEqual(lessonHref(tip('crypto', ['inconnu']), modules, universes), { pathname: '/apprendre' });
});
