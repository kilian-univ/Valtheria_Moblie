/// <reference types="node" />
// Lancer : npm test
// Sons de l'app : règles (utils/soundRules.ts) et fichiers (assets/sounds)

import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { test } from 'node:test';

import {
  chestStepRate,
  comboReached,
  EVENT_SOUNDS,
  parseSoundSetting,
  SOUND_NAMES,
  soundAllowed,
  soundForEvent,
} from '../src/utils/soundRules';
import { RUN_MIN } from '../src/utils/lessonPlayer';

const root = new URL('../', import.meta.url);

test('chaque événement a son son', () => {
  assert.equal(soundForEvent('pick'), 'select');
  assert.equal(soundForEvent('right'), 'correct');
  assert.equal(soundForEvent('wrong'), 'wrong');
  assert.equal(soundForEvent('swipe'), 'swipe');
  assert.equal(soundForEvent('combo'), 'combo');
  assert.equal(soundForEvent('lessonComplete'), 'lesson-complete');
  assert.equal(soundForEvent('streakUp'), 'streak');
  assert.equal(soundForEvent('chestStep'), 'chest-step');
  assert.equal(soundForEvent('chestOpen'), 'chest-open');
  assert.equal(soundForEvent('coins'), 'coins');
  assert.equal(soundForEvent('unlock'), 'unlock');
  // Les onze sons servent tous
  assert.deepEqual(new Set(Object.values(EVENT_SOUNDS)), new Set(SOUND_NAMES));
});

test('un fichier .m4a pour chaque son, chargé par le lecteur', () => {
  const player = readFileSync(new URL('src/utils/sound.ts', root), 'utf8');
  for (const name of SOUND_NAMES) {
    const file = new URL(`assets/sounds/${name}.m4a`, root);
    assert.ok(existsSync(file), `fichier absent : ${name}.m4a`);
    assert.ok(statSync(file).size > 1000, `fichier vide : ${name}.m4a`);
    assert.ok(player.includes(`assets/sounds/${name}.m4a`), `non chargé : ${name}`);
  }
});

test('coffre : chaque palier un peu plus aigu', () => {
  assert.equal(chestStepRate(0), 1);
  const rates = [0, 1, 2, 3].map(chestStepRate);
  for (let i = 1; i < rates.length; i++) assert.ok(rates[i] > rates[i - 1]);
  // Deux demi-tons par palier
  assert.ok(Math.abs(chestStepRate(1) - Math.pow(2, 2 / 12)) < 1e-9);
  assert.ok(Math.abs(chestStepRate(3) - Math.pow(2, 6 / 12)) < 1e-9);
  // Jamais au-delà du double, jamais en dessous de 1
  assert.ok(chestStepRate(50) <= 2);
  assert.equal(chestStepRate(-2), 1);
  assert.equal(chestStepRate(Number.NaN), 1);
});

test('combo : à l’apparition de la pastille (3), puis à chaque nouveau palier', () => {
  assert.equal(RUN_MIN, 3);
  assert.equal(comboReached(1, 2, RUN_MIN), false);
  assert.equal(comboReached(2, 3, RUN_MIN), true);
  assert.equal(comboReached(3, 4, RUN_MIN), true);
  // Série cassée, ou inchangée : rien
  assert.equal(comboReached(4, 0, RUN_MIN), false);
  assert.equal(comboReached(4, 4, RUN_MIN), false);
});

test('réglage Sons : activé par défaut, coupé seulement sur demande', () => {
  assert.equal(parseSoundSetting(null), true);
  assert.equal(parseSoundSetting(undefined), true);
  assert.equal(parseSoundSetting('on'), true);
  assert.equal(parseSoundSetting('n’importe quoi'), true);
  assert.equal(parseSoundSetting('off'), false);
  // Coupé : aucun son, nulle part
  assert.equal(soundAllowed(false, false, true), false);
  assert.equal(soundAllowed(false, true, true), false);
  assert.equal(soundAllowed(true, false, false), true);
  // Web : rien avant une première interaction
  assert.equal(soundAllowed(true, true, false), false);
  assert.equal(soundAllowed(true, true, true), true);
});

test('pas de son à chaque cran de curseur : la vibration seule', () => {
  const haptics = readFileSync(new URL('src/utils/haptics.ts', root), 'utf8');
  assert.ok(!haptics.includes('playSound'), 'les vibrations ne jouent plus de son');
  const slider = readFileSync(new URL('src/components/apprendre/player/TrackSlider.tsx', root), 'utf8');
  assert.ok(!slider.includes('feedback') && !slider.includes('playSound'));
});
