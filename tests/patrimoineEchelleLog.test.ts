/// <reference types="node" />
// Lancer : npm test
// Échelle logarithmique des courbes du patrimoine (19/10/2026) : valeurs proches
// de zéro, une seule valeur, période courte, plage étroite, repères recalculés,
// croissance de 1 € en Performance, option impossible en Plus-value.

import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  LOG_DISABLED_PLUS_VALUE,
  LOG_FALLBACK,
  logScaleState,
  makeScale,
  niceTicks,
  plottedSeries,
  roundGrowth,
  roundSignificant,
  tickLabel,
} from '../src/utils/patrimoine/chart';

const FRAME = { width: 300, height: 170, padTop: 14, padBottom: 14 };
const inFrame = (y: number) => Number.isFinite(y) && y >= 0 && y <= FRAME.height;

test('un même pourcentage prend la même hauteur, quel que soit le niveau', () => {
  const s = makeScale([100, 110, 1000, 1100], 4, FRAME, { log: true });
  assert.ok(s.log);
  assert.ok(Math.abs(s.y(100) - s.y(110) - (s.y(1000) - s.y(1100))) < 1e-9);
});

test('valeurs proches de zéro : échelle appliquée, repères positifs et dans la courbe', () => {
  const values = [0.0012, 0.003, 0.0105];
  const s = makeScale(values, values.length, FRAME, { log: true });
  assert.ok(s.log);
  for (const v of values) assert.ok(inFrame(s.y(v)), `y(${v}) = ${s.y(v)}`);
  const ticks = niceTicks(s);
  assert.ok(ticks.length >= 2, String(ticks));
  for (const t of ticks) assert.ok(t > 0 && t >= s.min && t <= s.max, `${t} hors de [${s.min}, ${s.max}]`);
  // Une valeur nulle sur la période : retour au linéaire, et la raison est dite
  assert.equal(makeScale([0, 0.003], 2, FRAME, { log: true }).log, false);
  assert.deepEqual(logScaleState(true, 'valeur', [0, 0.003]), { applied: false, note: LOG_FALLBACK, disabledReason: null });
});

test('une seule valeur : rien de cassé, la valeur au milieu', () => {
  const s = makeScale([27000], 1, FRAME, { log: true });
  assert.ok(s.log && s.min < 27000 && s.max > 27000);
  assert.ok(inFrame(s.y(27000)));
  assert.equal(s.x(0), FRAME.width / 2);
  for (const t of niceTicks(s)) assert.ok(Number.isFinite(t) && t > 0);
});

test('période courte et courbe plate : une petite plage, des repères finis', () => {
  const s = makeScale([1400, 1400], 2, FRAME, { log: true });
  assert.ok(s.log && s.min < 1400 && s.max > 1400);
  assert.ok(inFrame(s.y(1400)));
  const ticks = niceTicks(s);
  assert.ok(ticks.every((t) => Number.isFinite(t) && t >= s.min && t <= s.max), String(ticks));
});

test('plage étroite (patrimoine réel, 24 017 à 29 084 €) : repères recalculés, régulièrement espacés', () => {
  const s = makeScale([24017, 26500, 29084], 3, FRAME, { log: true });
  const ticks = niceTicks(s);
  assert.equal(ticks.length, 3, String(ticks));
  // Valeurs rondes, à un même pas (ici des centaines d'euros)
  for (const t of ticks) assert.equal(t % 100, 0, `${t} arrondi`);
  // Écarts en pixels presque égaux : même rapport entre deux repères voisins
  const gaps = [s.y(ticks[0]) - s.y(ticks[1]), s.y(ticks[1]) - s.y(ticks[2])];
  assert.ok(Math.abs(gaps[0] - gaps[1]) < 0.35 * Math.max(...gaps), `écarts ${gaps}`);
  // Sur une large plage, les valeurs rondes 1, 2, 5 × 10^n restent
  assert.ok(niceTicks(makeScale([9, 253], 2, FRAME, { log: true })).every((v) => /^[125]0*$/.test(String(v))));
});

test('Performance : la croissance de 1 € investi, repères en pourcentage', () => {
  const pct = [-3.858, 0, 5, 16.428];
  const growth = plottedSeries(pct, 'performance', true);
  assert.deepEqual(growth, [1 - 0.03858, 1, 1.05, 1.16428]);
  // Sans échelle logarithmique : les rendements tels quels
  assert.deepEqual(plottedSeries(pct, 'performance', false), pct);
  assert.equal(logScaleState(true, 'performance', growth).applied, true);
  const s = makeScale(growth, growth.length, FRAME, { log: true });
  const ticks = niceTicks(s, 3, roundGrowth);
  assert.ok(ticks.length >= 2, String(ticks));
  const labels = ticks.map((g) => tickLabel((g - 1) * 100, 'pct'));
  for (const l of labels) assert.match(l, /^(0 %|[+−] \d+ %)$/, `repère en pour cent entier : ${l}`);
  // + 100 % et − 50 % : même hauteur depuis 0 %
  const wide = makeScale([0.5, 1, 2], 3, FRAME, { log: true });
  assert.ok(Math.abs(wide.y(0.5) - wide.y(1) - (wide.y(1) - wide.y(2))) < 1e-9);
  assert.equal(roundGrowth(1.0349), 1.03);
  assert.equal(roundGrowth(1.2549), 1.25);
});

test('Plus-value : option impossible, avec son explication ; choix mémorisé intact', () => {
  assert.deepEqual(logScaleState(true, 'plus-value', [7236, 9126]), { applied: false, note: null, disabledReason: LOG_DISABLED_PLUS_VALUE });
  assert.deepEqual(logScaleState(false, 'plus-value', [7236]), { applied: false, note: null, disabledReason: LOG_DISABLED_PLUS_VALUE });
  // Ailleurs, rien tant que l'échelle n'est pas choisie ; une phrase quand elle l'est
  assert.deepEqual(logScaleState(false, 'valeur', [1, 2]), { applied: false, note: null, disabledReason: null });
  assert.deepEqual(logScaleState(true, 'cours', [89.6, 110]), { applied: true, note: 'Échelle logarithmique', disabledReason: null });
});

test('repère rond en euros : sans centimes, même sous 100 €', () => {
  assert.equal(tickLabel(10, 'eur'), '10\u00a0€');
  assert.equal(tickLabel(50, 'eur'), '50\u00a0€');
  assert.equal(tickLabel(12.5, 'eur'), '12,50\u00a0€');
  assert.equal(tickLabel(26500, 'eur'), '26\u202f500\u00a0€');
});

test('arrondi à deux chiffres significatifs', () => {
  assert.equal(roundSignificant(26480), 26000);
  assert.equal(roundSignificant(0.01234), 0.012);
  assert.equal(roundSignificant(1.0349), 1);
  assert.equal(roundSignificant(-4.6), -4.6);
  assert.equal(roundSignificant(0), 0);
});
