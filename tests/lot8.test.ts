/// <reference types="node" />
// Lancer : npm test
// Lot 8 : curseurs sans rendu React pendant le geste (simulateur, répartir,
// doigt sur la courbe du patrimoine), test de Sentry caché dans les Réglages.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { computeFormula, formulaSeries } from '../src/lesson/formulas';
import { blendRows, linePath, SIM_TABLE_MAX_ROWS, simulatorTable, tableRow } from '../src/lesson/simulatorTable';
import { SECRET_TAP_GAP_MS, SECRET_TAP_START, SECRET_TAPS, secretTap } from '../src/utils/secretTap';

const root = new URL('../', import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root), 'utf8');

const PARAMS = { monthly: 100, rate: 0.05, end_age: 65 };

test('table du simulateur : une ligne par cran, mêmes résultats et mêmes courbes que la formule', () => {
  const table = simulatorTable('savings_from_age', PARAMS, 20, 50, 1);
  assert.equal(table.values.length, 31);
  assert.equal(table.stride, 1);
  assert.deepEqual([table.values[0], table.values[10], table.values[30]], [20, 30, 50]);
  // Chaque ligne = la formule à cette valeur
  for (const i of [0, 10, 30]) {
    assert.deepEqual(table.results[i], computeFormula('savings_from_age', table.values[i], PARAMS));
    const series = formulaSeries('savings_from_age', table.values[i], PARAMS);
    assert.deepEqual(table.main[i], series?.main);
    assert.deepEqual(table.base[i], series?.base);
    assert.equal(table.from[i], series?.from);
  }
});

test('table du simulateur : trop de crans, un sur plusieurs, la borne haute gardée', () => {
  const table = simulatorTable('loan_over_years', { capital: 200000, rate: 0.035 }, 1, 2000, 1);
  assert.ok(table.values.length <= SIM_TABLE_MAX_ROWS + 1);
  assert.ok(table.stride > 1);
  assert.equal(table.values[0], 1);
  assert.equal(table.values[table.values.length - 1], 2000);
});

test('ligne de la table pour une valeur du curseur, bornée', () => {
  assert.equal(tableRow(30, 20, 1, 1, 31), 10);
  assert.equal(tableRow(19, 20, 1, 1, 31), 0);
  assert.equal(tableRow(99, 20, 1, 1, 31), 30);
  // Un cran sur 4
  assert.equal(tableRow(28, 20, 1, 4, 10), 2);
});

test('courbe entre deux lignes, et son tracé SVG', () => {
  const rows = [
    [0, 10],
    [10, 30],
  ];
  assert.deepEqual(blendRows(rows, 0), [0, 10]);
  assert.deepEqual(blendRows(rows, 1), [10, 30]);
  assert.deepEqual(blendRows(rows, 0.5), [5, 20]);
  assert.deepEqual(blendRows(rows, 7), [10, 30]);
  assert.deepEqual(blendRows([], 0), []);
  // Deux points sur 100 px de large, 50 de haut, marge 0, haut à 30
  assert.equal(linePath([0, 30], 100, 50, 0, 30), 'M0.0,50.0 L100.0,0.0');
});

test('simulateur, répartir, courbe du patrimoine : aucun rendu React pendant le geste', () => {
  const sim = read('src/components/apprendre/screens/SimulatorScreen.tsx');
  // Rien n'écrit d'état React pendant le glissement : le curseur écrit sa valeur partagée
  assert.ok(sim.includes('uiValue={raw}') && !/onChange=\{/.test(sim));
  assert.ok(!sim.includes('setDragging') && !sim.includes('useThrottledValue'));
  // Lecteur : le verrou du défilement est une valeur partagée (plus d'état React)
  const player = read('src/screens/ApprendreDetailScreen.tsx');
  assert.ok(player.includes('const scrollLocked = useSharedValue(false);'));
  assert.ok(player.includes('animatedProps={scrollLockProps}') && !player.includes('setScrollLocked'));
  // Répartir : la barre de la paie et les textes suivent la valeur partagée
  const alloc = read('src/components/apprendre/screens/AllocateScreen.tsx');
  assert.ok(alloc.includes('<Segment') && alloc.includes('useAnimatedReaction('));
  // Courbe : gestes sur le fil d'interface (plus de runOnJS), point touché partagé
  const chart = read('src/components/patrimoine/LineChart.tsx');
  assert.ok(!chart.includes('.runOnJS(true)'));
  assert.ok(chart.includes('scrub?: SharedValue<number>') && chart.includes('<ScrubMarker'));
  assert.ok(!chart.includes('setTouched') && !chart.includes('onScrub'));
  for (const screen of ['PatrimoineScreen', 'ActifScreen']) {
    const src = read(`src/screens/patrimoine/${screen}.tsx`);
    assert.ok(src.includes('const scrub = useSharedValue(-1);'), screen);
    assert.ok(src.includes('scrub={scrub}') && src.includes('<ScrubSwap'), screen);
    assert.ok(!src.includes('setScrub'), screen);
  }
});

test('toucher caché : 7 touchers de suite, sans pause de plus de 1,5 s', () => {
  assert.equal(SECRET_TAPS, 7);
  let state = SECRET_TAP_START;
  let fired = 0;
  for (let i = 0; i < 7; i++) {
    const r = secretTap(state, 1000 + i * 300);
    state = r.state;
    if (r.fire) fired++;
  }
  assert.equal(fired, 1);
  assert.deepEqual(state, SECRET_TAP_START);
  // Une pause trop longue : le compte repart de zéro
  state = SECRET_TAP_START;
  for (let i = 0; i < 6; i++) state = secretTap(state, i * 300).state;
  const late = secretTap(state, 5 * 300 + SECRET_TAP_GAP_MS + 1);
  assert.equal(late.fire, false);
  assert.equal(late.state.count, 1);
});

test('test de Sentry : l’erreur « Test Sentry Valtheria », rien d’autre', () => {
  const monitoring = read('src/monitoring.ts');
  assert.ok(monitoring.includes("export const TEST_ERROR_MESSAGE = 'Test Sentry Valtheria';"));
  assert.ok(monitoring.includes('Sentry.captureException(new Error(TEST_ERROR_MESSAGE)'));
  assert.ok(monitoring.includes('if (!MONITORING_ON) return false;'));
  // Le rapport passe par le même nettoyage que les autres (ni personne, ni requête)
  assert.ok(monitoring.includes('beforeSend: (event) => scrubEvent(event)'));
  const settings = read('src/screens/header/SettingsScreen.tsx');
  assert.ok(settings.includes('const next = secretTap(taps, Date.now());'));
  assert.ok(settings.includes("'Erreur de test envoyée'"));
  assert.ok(settings.includes('<Pressable onPress={tapVersion} accessible={false}'));
});
