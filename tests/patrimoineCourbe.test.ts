/// <reference types="node" />
// Lancer : npm test
// Courbes du patrimoine, refonte du 19/10/2026 : échelle à 6 % de marge et
// marge horizontale intérieure, hauteur selon l'écran, repères courts de la
// marge de droite, extrêmes de la période, étiquettes qui évitent la courbe,
// phrase de l'échelle logarithmique, date et jour du point touché.

import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  chartHeight,
  compactTick,
  dayKey,
  extremes,
  LOG_ACTIVE,
  LOG_ALIKE,
  logScaleState,
  makeScale,
  placeLabel,
  plottedSeries,
  scrubDateLabel,
  textWidth,
  type Pt,
} from '../src/utils/patrimoine/chart';

const FRAME = { width: 320, height: 220, padTop: 0, padBottom: 0, padX: 7 };

test('échelle : du minimum au maximum, 6 % de marge, la courbe touche presque le haut et le bas', () => {
  const s = makeScale([24017, 26000, 29084], 3, FRAME);
  const top = s.y(29084);
  const bottom = s.y(24017);
  // 6 % de l'écart de chaque côté : environ 5 % de la hauteur
  assert.ok(Math.abs(top - 220 * (0.06 / 1.12)) < 0.01, `haut à ${top}`);
  assert.ok(Math.abs(220 - bottom - 220 * (0.06 / 1.12)) < 0.01, `bas à ${bottom}`);
  // Aucune place réservée en plus : la plage tient toute la hauteur
  assert.ok(Math.abs(s.y(s.max)) < 1e-9 && Math.abs(s.y(s.min) - 220) < 1e-9);
});

test('marge horizontale intérieure : le premier et le dernier point jamais sur le bord', () => {
  const s = makeScale([1, 2, 3, 4], 4, FRAME);
  assert.equal(s.x(0), 7);
  assert.equal(s.x(3), 320 - 7);
  assert.equal(s.index(7), 0);
  assert.equal(s.index(320), 3);
  assert.equal(s.index(0), 0);
});

test('hauteur de la zone : 220 sur iPhone SE, 260 sur grand iPhone, entre les deux', () => {
  assert.equal(chartHeight(667), 220);
  assert.equal(chartHeight(932), 260);
  assert.equal(chartHeight(844), 247);
  assert.equal(chartHeight(568), 220);
  assert.equal(chartHeight(1200), 260);
});

test('repères courts pour la marge de droite', () => {
  assert.equal(compactTick(28000, 'eur'), '28 k€');
  assert.equal(compactTick(26500, 'eur'), '26,5 k€');
  assert.equal(compactTick(200, 'eur'), '200 €');
  assert.equal(compactTick(1_250_000, 'eur'), '1,25 M€');
  assert.equal(compactTick(-12000, 'eur'), '−12 k€');
  assert.equal(compactTick(13, 'pct'), '+ 13 %');
  // Assez courts pour la marge de 46 px
  for (const t of ['28 k€', '26,5 k€', '+ 13 %']) assert.ok(textWidth(t, 10) <= 40, t);
});

test('extrêmes de la période : le plus haut et le plus bas ; rien pour une courbe plate', () => {
  assert.deepEqual(extremes([3, 9, null, 1, 9, 4]), { max: 1, min: 3 });
  assert.equal(extremes([5, 5, 5]), null);
  assert.equal(extremes([1, 2]), null);
  assert.equal(extremes([]), null);
});

test('étiquette : placée loin de la courbe, dans la zone, sans chevaucher les autres', () => {
  const zone = { x: 0, y: 0, w: 300, h: 200 };
  // Courbe haute à gauche, basse à droite ; ligne de référence à mi-hauteur
  const curve: Pt[] = Array.from({ length: 31 }, (_, i) => ({ x: i * 10, y: i < 15 ? 20 : 180 }));
  const size = { w: 80, h: 18 };
  const candidates = Array.from({ length: 14 }, (_, k) => ({ x: k * 16, y: 100 - 9 }));
  const box = placeLabel(candidates, size, curve, zone);
  // Loin de la marche (x = 150) où la courbe traverse la mi-hauteur
  assert.ok(box.x + box.w < 140 || box.x > 160, `x = ${box.x}`);
  // Une position hors de la zone est ramenée dedans
  const clamped = placeLabel([{ x: 290, y: -30 }], size, [], zone);
  assert.deepEqual(clamped, { x: 220, y: 0, w: 80, h: 18 });
  // Une autre étiquette déjà posée est évitée
  const taken = { x: 0, y: 91, w: 120, h: 18 };
  const other = placeLabel([{ x: 0, y: 91 }, { x: 200, y: 91 }], size, [], zone, [taken]);
  assert.equal(other.x, 200);
});

test('échelle logarithmique : dite seulement si le maximum dépasse 2 fois le minimum', () => {
  assert.equal(logScaleState(true, 'valeur', [24017, 29084]).note, LOG_ALIKE);
  assert.equal(logScaleState(true, 'cours', [9.04, 253]).note, LOG_ACTIVE);
  assert.equal(logScaleState(true, 'cours', [50, 100]).note, LOG_ACTIVE);
  // L'option reste choisie (appliquée) dans les deux cas
  assert.equal(logScaleState(true, 'valeur', [24017, 29084]).applied, true);
  // Performance : sur la croissance de 1 € (1 + rendement)
  assert.equal(logScaleState(true, 'performance', plottedSeries([-3.9, 16.4], 'performance', true)).note, LOG_ALIKE);
  assert.equal(logScaleState(true, 'performance', plottedSeries([-40, 120], 'performance', true)).note, LOG_ACTIVE);
});

test('point touché : date avec l’heure sur 1 jour et 1 semaine ; un jour par date', () => {
  const now = new Date(2026, 9, 19, 12);
  const t = new Date(2026, 9, 18, 14, 5).getTime();
  assert.equal(scrubDateLabel(t, '1J', now), '18 oct. · 14 h 05');
  assert.equal(scrubDateLabel(t, '1A', now), '18 oct.');
  assert.equal(dayKey(t), dayKey(new Date(2026, 9, 18, 23, 59).getTime()));
  assert.notEqual(dayKey(t), dayKey(new Date(2026, 9, 19, 0, 1).getTime()));
});
