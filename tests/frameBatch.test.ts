/// <reference types="node" />
// Lancer : npm test
// Cadence des curseurs : valeur vivante, regroupement par image, limitation

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { createLiveValue, createThrottle } from '../src/utils/frameBatch';

const root = new URL('../', import.meta.url);

test('valeur vivante : prévient ses abonnés à chaque changement, pas sinon', () => {
  const live = createLiveValue(3);
  let calls = 0;
  const stop = live.subscribe(() => calls++);
  live.set(3);
  assert.equal(calls, 0);
  live.set(4);
  live.set(5);
  assert.equal(live.get(), 5);
  assert.equal(calls, 2);
  stop();
  live.set(6);
  assert.equal(calls, 2);
});

test('limitation : une vibration toutes les 40 ms au plus', () => {
  let t = 0;
  const allow = createThrottle(40, () => t);
  let n = 0;
  // Un cran toutes les 10 ms pendant 400 ms
  for (; t <= 400; t += 10) if (allow()) n++;
  assert.equal(n, 11);
});

test('curseur : tout le mouvement sur le fil d’interface, JavaScript au changement de cran seulement', () => {
  const src = readFileSync(new URL('src/components/apprendre/player/TrackSlider.tsx', root), 'utf8');
  // Le bouton et le remplissage suivent une valeur partagée (aucun état React)
  assert.ok(src.includes('const fillStyle = useAnimatedStyle(() => {') && src.includes('return { width: pos.get() };'));
  assert.ok(!/useState\(0\)/.test(src), 'plus de largeur en état React');
  // onUpdate ne prévient JavaScript qu'au changement de cran
  // … et écrit le cran dans la valeur partagée de l'écran (fil d'interface)
  assert.match(src, /if \(allowed !== current\.get\(\)\) \{\s*current\.set\(allowed\);\s*if \(uiValue && !readOnly\) uiValue\.set\(allowed\);\s*scheduleOnRN\(stepped, allowed\);/);
  assert.ok(!src.includes('scheduleOnRN(updateFromX'));
  // Au lâcher : la valeur finale exacte (le dernier cran calculé), jamais limitée
  assert.match(src, /scheduleOnRN\(settle, current\.get\(\)\)/);
  assert.match(src, /onChange\?\.\(final\);\s*onCommit\?\.\(final\);/);
});

test('écrans : grand chiffre isolé ; simulateur et répartir sans rendu React pendant le geste', () => {
  const read = (path: string) => readFileSync(new URL(path, root), 'utf8');
  const pari = read('src/components/apprendre/screens/SliderScreen.tsx');
  assert.ok(pari.includes('<Live store={live}>'));
  assert.ok(pari.includes('onChange={live.set}') && pari.includes('onCommit={commit}'));
  // Simulateur (lot 8) : la table de chaque cran, lue sur le fil d'interface
  const sim = read('src/components/apprendre/screens/SimulatorScreen.tsx');
  assert.ok(sim.includes('const row = useDerivedValue(() => tableRow(raw.get(), min, step, stride, rows));'));
  assert.ok(sim.includes('uiValue={raw}') && !sim.includes('onChange='));
  assert.ok(sim.includes('<LiveBigNumber') && sim.includes('<SimChart main={table.main} base={table.base} row={row}'));
  assert.ok(sim.includes('value={settled}'));
  // La réplique de Val ne change qu'au lâcher, si la tranche change
  assert.match(sim, /\}, \[moved, valText, valMood, setVal\]\);/);
  const chart = read('src/components/apprendre/player/SimChart.tsx');
  assert.ok(chart.includes('useAnimatedProps(() => ({ d: linePath(blendRows(main, position.get())'));
  // Répartir (lot 8) : la répartition vivante dans une valeur partagée
  const alloc = read('src/components/apprendre/screens/AllocateScreen.tsx');
  assert.ok(alloc.includes('const ui = useSharedValue(buckets.map((b) => values[b.key] ?? 0));'));
  assert.ok(alloc.includes('uiValue={reservoir ? current : dragged}'));
  assert.ok(!alloc.includes('createFrameBatch') && !alloc.includes('onChange='));
});
