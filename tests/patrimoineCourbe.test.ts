/// <reference types="node" />
// Lancer : npm test
// Courbes du patrimoine, refonte du 19/10/2026 : échelle à 6 % de marge et
// marge horizontale intérieure, hauteur selon l'écran, repères courts de la
// marge de droite, extrêmes de la période, étiquettes qui évitent la courbe,
// date et jour du point touché ; échelle logarithmique retirée (19/10/2026).

import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  chartHeight,
  compactTick,
  dayKey,
  extremes,
  makeScale,
  niceTicks,
  placeLabel,
  roundSignificant,
  scrubDateLabel,
  textWidth,
  tickLabel,
  type Pt,
} from '../src/utils/patrimoine/chart';
import { hasRetiredKeys, parsePrefs } from '../src/utils/patrimoine/prefs';

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

test('valeur seule, courbe plate, valeurs proches de zéro : une plage finie, rien de cassé', () => {
  const one = makeScale([27000], 1, FRAME);
  assert.ok(one.min < 27000 && one.max > 27000);
  assert.equal(one.x(0), 320 / 2);
  const flat = makeScale([1400, 1400], 2, FRAME);
  assert.ok(flat.min < 1400 && flat.max > 1400 && Number.isFinite(flat.y(1400)));
  const tiny = makeScale([0.0012, 0.003, 0.0105], 3, FRAME);
  for (const v of [0.0012, 0.003, 0.0105]) assert.ok(tiny.y(v) >= 0 && tiny.y(v) <= 220);
  for (const t of niceTicks(tiny)) assert.ok(Number.isFinite(t) && t >= tiny.min && t <= tiny.max);
});

test('repère rond en euros : sans centimes, même sous 100 € ; arrondi des millions', () => {
  assert.equal(tickLabel(10, 'eur'), '10\u00a0€');
  assert.equal(tickLabel(12.5, 'eur'), '12,50\u00a0€');
  assert.equal(roundSignificant(26480), 26000);
  assert.equal(roundSignificant(1.2549, 3), 1.25);
  assert.equal(roundSignificant(0), 0);
});

test('échelle logarithmique retirée : le choix mémorisé est effacé des préférences', () => {
  const raw = { discreet: true, logScale: true };
  assert.equal(hasRetiredKeys(raw), true);
  const prefs = parsePrefs(raw);
  assert.equal('logScale' in prefs, false);
  assert.equal(prefs.discreet, true);
  // Une fois réécrites, plus rien à nettoyer
  assert.equal(hasRetiredKeys(JSON.parse(JSON.stringify(prefs))), false);
  assert.equal(hasRetiredKeys(null), false);
});

test('point touché : date avec l’heure sur 1 jour et 1 semaine ; un jour par date', () => {
  const now = new Date(2026, 9, 19, 12);
  const t = new Date(2026, 9, 18, 14, 5).getTime();
  assert.equal(scrubDateLabel(t, '1J', now), '18 oct. · 14 h 05');
  assert.equal(scrubDateLabel(t, '1A', now), '18 oct.');
  assert.equal(dayKey(t), dayKey(new Date(2026, 9, 18, 23, 59).getTime()));
  assert.notEqual(dayKey(t), dayKey(new Date(2026, 9, 19, 0, 1).getTime()));
});
