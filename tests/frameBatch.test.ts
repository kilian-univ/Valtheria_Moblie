/// <reference types="node" />
// Lancer : npm test
// Cadence des curseurs : valeur vivante, regroupement par image, limitation

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { createFrameBatch, createLiveValue, createThrottle } from '../src/utils/frameBatch';

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

test('regroupement : au plus un envoi par image, la dernière valeur', () => {
  const frames: (() => void)[] = [];
  const sent: number[] = [];
  const batch = createFrameBatch<number>((v) => sent.push(v), (run) => frames.push(run));
  // Rafale de 30 crans dans la même image
  for (let v = 1; v <= 30; v++) batch.push(v);
  assert.equal(frames.length, 1);
  assert.deepEqual(sent, []);
  frames.shift()!();
  assert.deepEqual(sent, [30]);
  // Image suivante
  batch.push(31);
  batch.push(32);
  frames.shift()!();
  assert.deepEqual(sent, [30, 32]);
  // Image sans changement : rien
  assert.equal(frames.length, 0);
});

test('regroupement : au lâcher, la valeur finale part tout de suite, exacte', () => {
  const frames: (() => void)[] = [];
  const sent: number[] = [];
  const batch = createFrameBatch<number>((v) => sent.push(v), (run) => frames.push(run));
  batch.push(7);
  batch.push(8);
  batch.flush();
  assert.deepEqual(sent, [8]);
  // L'image prévue ne renvoie rien de plus
  frames.shift()!();
  assert.deepEqual(sent, [8]);
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
  assert.ok(src.includes('const fillStyle = useAnimatedStyle(() => ({ width: pos.get() }));'));
  assert.ok(!/useState\(0\)/.test(src), 'plus de largeur en état React');
  // onUpdate ne prévient JavaScript qu'au changement de cran
  assert.match(src, /if \(allowed !== current\.get\(\)\) \{\s*current\.set\(allowed\);\s*scheduleOnRN\(stepped, allowed\);/);
  assert.ok(!src.includes('scheduleOnRN(updateFromX'));
  // Au lâcher : la valeur finale exacte (le dernier cran calculé), jamais limitée
  assert.match(src, /scheduleOnRN\(settle, current\.get\(\)\)/);
  assert.match(src, /onChange\(final\);\s*onCommit\?\.\(final\);/);
});

test('écrans : grand chiffre isolé, mises à jour lourdes regroupées par image', () => {
  const read = (path: string) => readFileSync(new URL(path, root), 'utf8');
  const pari = read('src/components/apprendre/screens/SliderScreen.tsx');
  assert.ok(pari.includes('<Live store={live}>'));
  assert.ok(pari.includes('onChange={live.set}') && pari.includes('onCommit={commit}'));
  const sim = read('src/components/apprendre/screens/SimulatorScreen.tsx');
  // Simulateur : courbe et montants au plus 30 fois par seconde pendant un
  // glissement, sans animation à relancer ; la valeur du curseur suit chaque cran
  assert.ok(sim.includes('const following = useThrottledValue(live, LIVE_UPDATE_MS);'));
  assert.match(sim, /const LIVE_UPDATE_MS = 33;/);
  assert.ok(sim.includes('animate={!dragging}'));
  assert.ok(sim.includes('<Live store={live}>'));
  assert.ok(sim.includes('value={settled}'));
  assert.ok(sim.includes('<RollingBigNumber'));
  // La réplique de Val ne change qu'au changement de tranche
  assert.match(sim, /\}, \[moved, valText, valMood, setVal\]\);/);
  const alloc = read('src/components/apprendre/screens/AllocateScreen.tsx');
  assert.ok(alloc.includes('createFrameBatch(apply'));
  assert.ok(alloc.includes('batch.current?.flush();'));
  assert.ok(read('src/components/apprendre/player/SimChart.tsx').includes('export default memo('));
});
