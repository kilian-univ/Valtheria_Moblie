/// <reference types="node" />
// Lancer : npm test
// Courbes (échelle, repères, échelle logarithmique, plus-value, rendement
// pondéré par le temps), devises (tout en euros, l'original à côté) et taux
// des livrets réglementés

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { makeScale, modeSeries, niceTicks, tickLabel, twrSeries } from '../src/utils/patrimoine/chart';
import { moneyEur, originalNote, ratesOf, toEur } from '../src/utils/patrimoine/currency';
import { rateDateLabel } from '../src/utils/patrimoine/format';
import { isRegulatedLivret, livretPayload } from '../src/utils/patrimoine/forms';
import { parsePortfolio, parsePosition, type ChartPoint, type Position } from '../src/utils/patrimoine/model';

const FRAME = { width: 300, height: 100, padTop: 0, padBottom: 0 };
const pt = (value: number, invested: number, i = 0): ChartPoint => ({ id: null, date: `2026-01-${String(i + 1).padStart(2, '0')}`, value, invested, isSnapshot: true });

// ── Échelle ─────────────────────────────────────────────────────────────

test('échelle : la plage de la courbe affichée, 8 % de marge, jamais zéro', () => {
  const s = makeScale([24000, 26000, 29000], 3, FRAME);
  assert.equal(s.min, 24000 - 5000 * 0.08);
  assert.equal(s.max, 29000 + 5000 * 0.08);
  assert.ok(!s.contains(0), 'zéro hors de la plage');
  assert.ok(!s.contains(19744), 'le montant investi ne déforme pas l’échelle');
  assert.equal(s.y(29000 + 400), 0);
  assert.equal(s.y(24000 - 400), 100);
  // Courbe plate : une petite plage autour de la valeur
  const flat = makeScale([1400, 1400], 2, FRAME);
  assert.ok(flat.min < 1400 && flat.max > 1400);
});

test('échelle logarithmique : un même pourcentage prend la même hauteur', () => {
  const s = makeScale([100, 1000, 10000], 3, FRAME, { log: true, margin: 0 });
  assert.ok(s.log);
  assert.ok(Math.abs(s.y(100) - s.y(1000) - (s.y(1000) - s.y(10000))) < 1e-9, '×10 = même hauteur');
  assert.equal(s.y(10000), 0);
  assert.equal(s.y(100), 100);
  // Une valeur nulle ou négative : retour au linéaire
  assert.equal(makeScale([-50, 100], 2, FRAME, { log: true }).log, false);
});

test('repères : trois valeurs rondes dans la plage affichée', () => {
  const ticks = niceTicks(makeScale([20392, 29084], 2, FRAME));
  assert.ok(ticks.length >= 2 && ticks.length <= 3, String(ticks));
  for (const t of ticks) {
    assert.ok(t >= 20392 - 1000 && t <= 29084 + 1000);
    assert.equal(t % 500, 0, `${t} arrondi`);
  }
  const pct = niceTicks(makeScale([-4, 9], 2, FRAME));
  assert.ok(pct.length >= 2 && pct.length <= 3 && pct.includes(0), `zéro parmi les repères : ${pct}`);
  const log = niceTicks(makeScale([60, 3000], 2, FRAME, { log: true }));
  assert.ok(log.length >= 2 && log.length <= 3, String(log));
  assert.ok(log.every((v) => /^[125]0*$/.test(String(v))), `valeurs 1, 2, 5 × 10^n : ${log}`);
  assert.equal(tickLabel(27000, 'eur'), '27\u202F000\u00A0€');
  assert.equal(tickLabel(10, 'pct'), '+\u00a010\u00a0%');
  assert.equal(tickLabel(0, 'pct'), '0\u00a0%');
  assert.equal(tickLabel(-2.5, 'pct'), '−\u00a02,5\u00a0%');
});

// ── Plus-value et performance ──────────────────────────────────────────

test('plus-value : la valeur moins le montant investi à chaque date', () => {
  assert.deepEqual(modeSeries([pt(1000, 1000), pt(1100, 1000, 1), pt(2150, 2000, 2)], 'plus-value'), [0, 100, 150]);
});

test('rendement pondéré par le temps : un versement ne compte pas comme un gain', () => {
  // +10 %, puis 1 000 € versés sans variation de cours : toujours +10 %
  const deposit = [pt(1000, 1000), pt(1100, 1000, 1), pt(2100, 2000, 2)];
  const twr = twrSeries(deposit);
  assert.ok(Math.abs(twr[1] - 10) < 1e-9);
  assert.ok(Math.abs(twr[2] - 10) < 1e-9, `versement neutralisé : ${twr[2]}`);
  // Puis +5 % sur l'ensemble : (1,10 × 1,05) − 1
  assert.ok(Math.abs(twrSeries([...deposit, pt(2205, 2000, 3)])[3] - 15.5) < 1e-9);
  // Retrait de 500 € sans variation : rendement inchangé
  assert.ok(Math.abs(twrSeries([pt(1000, 1000), pt(500, 500, 1)])[1]) < 1e-9);
  // Sans versement : la variation de la valeur
  assert.deepEqual(twrSeries([pt(100, 100), pt(80, 100, 1)]).map((v) => Math.round(v)), [0, -20]);
});

test('les trois modes donnent des courbes différentes dès qu’il y a des versements', () => {
  const pts = [pt(1000, 1000), pt(1100, 1000, 1), pt(2100, 2000, 2), pt(2000, 2000, 3)];
  const valeur = modeSeries(pts, 'valeur');
  const plus = modeSeries(pts, 'plus-value');
  const perf = modeSeries(pts, 'performance');
  assert.deepEqual(valeur, [1000, 1100, 2100, 2000]);
  assert.deepEqual(plus, [0, 100, 100, 0]);
  assert.equal(Math.round(perf[3] * 100) / 100, Math.round(((1.1 * (2000 / 2100)) - 1) * 10000) / 100);
  // Formes différentes : la valeur monte au versement, la plus-value non
  assert.ok(valeur[2] > valeur[1] && plus[2] === plus[1]);
});

// ── Devises ─────────────────────────────────────────────────────────────

const SOL = parsePosition({
  id: 5, ticker: 'SOL', name: 'Solana', type: 'crypto', quantity: 35.68629, buy_currency: 'USD', avg_cost: 81.4566, current_price: 104.45,
  invested: 2906.88, value: 3727.43, value_eur: 3315.18, invested_eur: 2585.38, gain_loss: 820.55, gain_loss_pct: 28.23,
})!;

test('devises : le taux de la liste (valeur en euros ÷ valeur), pour tout', () => {
  const rates = ratesOf([SOL], 1.124353);
  assert.ok(Math.abs(rates.USD - 3315.18 / 3727.43) < 1e-12, 'le taux de la position passe avant celui du serveur');
  assert.equal(rates.EUR, 1);
  assert.ok(Math.abs(toEur(81.4566, 'USD', rates)! - 72.45) < 0.01, 'prix de revient en euros');
  assert.equal(toEur(10, 'CHF', rates), null, 'devise inconnue : pas d’invention');
  assert.equal(moneyEur(81.4566, 'USD', rates, { exact: true }), '81,46\u00A0$, soit 72,45\u00A0€');
  assert.equal(moneyEur(79, 'USD', rates, { exact: true }), '79,00\u00A0$, soit 70,26\u00A0€');
  assert.equal(moneyEur(105.34, 'EUR', rates, { exact: true }), '105,34\u00A0€');
  assert.equal(moneyEur(10, 'CHF', rates, { exact: true }), '10,00\u00A0CHF');
  assert.equal(originalNote(81.4566, 'USD', { exact: true }), '81,46\u00A0$');
  assert.equal(originalNote(5, 'EUR'), null);
  // Sans position en dollars : le taux EUR/USD du serveur
  assert.ok(Math.abs(ratesOf([], 1.25).USD - 0.8) < 1e-12);
  assert.equal(parsePortfolio({ positions: [], closed_positions: [], fx: { eur_usd: 1.124353 } })!.eurUsd, 1.124353);
});

// ── Taux des livrets ───────────────────────────────────────────────────

test('livrets réglementés : le taux du site seulement, avec sa date', () => {
  const livret = parsePosition({ id: 10, ticker: 'LIVRET_A', type: 'livret', is_livret: true, rate: 3, interest_rate_pct: 1.7, interest_rate_source: 'regulatory', interest_rate_effective_at: '2026-08-01', interest_rate_verified_at: '2026-10-17T01:17:07+00:00' }) as Position;
  assert.equal(livret.interestRatePct, 1.7, 'jamais le taux gardé dans la position');
  assert.equal(livret.interestRateSource, 'regulatory');
  assert.equal(parsePosition({ id: 11, ticker: 'LIVRET_A', type: 'livret', is_livret: true, rate: 3 })!.interestRatePct, null, 'pas de copie de secours');
  assert.equal(rateDateLabel(livret.interestRateEffectiveAt, livret.interestRateVerifiedAt), 'taux au 1er\u00A0août 2026');
  assert.equal(rateDateLabel('2027-02-12', null), 'taux au 12\u00A0février 2027');
  assert.equal(rateDateLabel(null, '2026-10-17T01:17:07+00:00'), 'taux vérifié le 17\u00A0octobre 2026');
  assert.equal(rateDateLabel(null, null), null);

  for (const t of ['LIVRET_A', 'ldds', 'LEP', 'LIVRET_JEUNE', 'PEL', 'CEL']) assert.ok(isRegulatedLivret(t), t);
  assert.ok(!isRegulatedLivret('LIVRET_1729000000'));
  const a = livretPayload({ ticker: 'LIVRET_A', name: 'Livret A', amount: '1400', ratePct: '3' }, 1);
  assert.ok(a.ok && !('rate' in a.body), 'aucun taux envoyé pour un Livret A');
  const bank = livretPayload({ ticker: null, name: 'Livret de ma banque', amount: '800', ratePct: '3' }, 1);
  assert.ok(bank.ok && bank.body.rate === 3, 'un livret bancaire garde son taux');
});
