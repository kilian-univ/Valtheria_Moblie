/// <reference types="node" />
// Lancer : npm test
// Bulle de Val (utils/speechBubble.ts)

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { besideLayout, noOrphan, tailDirection, tailLength, tailPoints } from '../src/utils/speechBubble';

const NBSP = ' ';

test('pas de mot seul sur la dernière ligne', () => {
  assert.equal(noOrphan('Salut ! Moi, c’est Val.'), `Salut ! Moi, c’est${NBSP}Val.`);
  // Ponctuation finale isolée : collée au mot d'avant, lui-même collé au précédent
  assert.equal(noOrphan('Je te fais signe chaque jour ?'), `Je te fais signe chaque${NBSP}jour${NBSP}?`);
  assert.equal(noOrphan('Bonjour'), 'Bonjour');
  assert.equal(noOrphan('  Deux mots  '), `Deux${NBSP}mots`);
  // Emphase conservée
  assert.equal(noOrphan('Tu as **gagné** 20 XP'), `Tu as **gagné** 20${NBSP}XP`);
});

test('pointe : vers la bouche, dans un cône de 60° autour du côté', () => {
  const left = tailDirection('left', { x: -30, y: 0 });
  assert.deepEqual([Math.round(left.x * 100), Math.round(left.y * 100)], [-100, 0]);
  // Bouche un peu plus bas : la pointe descend
  const down = tailDirection('left', { x: -30, y: 10 });
  assert.ok(down.x < 0 && down.y > 0);
  // Bouche derrière la bulle : ramenée à 60° au plus
  const back = tailDirection('left', { x: 10, y: 30 });
  assert.ok(back.x < 0.01 && Math.abs(Math.atan2(back.y, -back.x) * (180 / Math.PI) - 60) < 1);
  // Sans visée : perpendiculaire au bord
  assert.deepEqual(tailDirection('bottom'), { x: 0, y: 1 });
  assert.deepEqual(tailDirection('right', null), { x: 1, y: 0 });
});

test('pointe : 55 % de l’écart entre la bulle et la tête, bornée', () => {
  assert.equal(tailLength(20), 11);
  assert.equal(tailLength(4), 8);
  assert.equal(tailLength(200), 40);
  const pts = tailPoints('left', { x: -1, y: 0 }, 12, 16);
  assert.deepEqual(
    pts.map((p) => [Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10]),
    [
      [1.5, -8],
      [-12, 0],
      [1.5, 8],
    ]
  );
});

test('bulle à côté de Val : à hauteur de bouche, pointe vers la bouche', () => {
  // Portrait rond de 64 : bouche à (0,58 ; 0,66), tête jusqu'à 0,8
  const face = { mouthX: 0.58, mouthY: 0.66, headRight: 0.8 };
  const l = besideLayout(face, 64, 64, 12, 24);
  // La pointe est à la hauteur de la bouche
  assert.equal(Math.round(l.offsetTop + l.anchor), Math.round(64 * 0.66));
  assert.equal(l.aim.y, 0);
  assert.ok(l.aim.x < 0);
  // 55 % de l'écart entre la bulle et le bord de la tête (64 + 12 - 51,2)
  assert.equal(Math.round(l.length * 10) / 10, Math.round((64 + 12 - 64 * 0.8) * 0.55 * 10) / 10);
  // Bouche plus haute que la pointe voulue : la bulle remonte au haut de Val
  const high = besideLayout({ mouthX: 0.5, mouthY: 0.1, headRight: 0.7 }, 100, 100, 10, 24);
  assert.equal(high.offsetTop, 0);
  assert.equal(high.anchor, 10);
});
