/// <reference types="node" />
// Lancer : npm test
// Bonnes réponses d'affilée et défis de précision (utils/accuracy.ts)

import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  allTimeBestLine,
  applyLesson,
  bestRunLine,
  bestRunOf,
  CHALLENGES,
  challengeHeadline,
  EMPTY_ACCURACY,
  findChallenge,
  isPerfectLesson,
  mergeAccuracy,
  parseAccuracy,
  RUN_MILESTONES,
  runEvent,
} from '../src/utils/accuracy';
import { firstTryRun } from '../src/utils/lessonPlayer';
import { normalizeLesson } from '../src/lesson/normalize';

const ok = (n: number) => Array.from({ length: n }, () => ({ correct: true }));
const ko = { correct: false };

test('série d’affilée : la pastille surgit à 3, pulse ensuite, paliers à 5 et 10, se casse sur une erreur', () => {
  assert.equal(runEvent(0, 1), null);
  assert.equal(runEvent(1, 2), null);
  assert.deepEqual(runEvent(2, 3), { kind: 'appear', word: null });
  assert.deepEqual(runEvent(3, 4), { kind: 'grow', word: null });
  assert.deepEqual(runEvent(4, 5), { kind: 'milestone', word: 'En feu !' });
  assert.deepEqual(runEvent(5, 6), { kind: 'grow', word: null });
  assert.deepEqual(runEvent(9, 10), { kind: 'milestone', word: 'Inarrêtable !' });
  assert.deepEqual(runEvent(10, 11), { kind: 'grow', word: null });
  assert.deepEqual(runEvent(4, 0), { kind: 'break', word: null });
  assert.equal(runEvent(2, 0), null, 'pas de pastille, rien à effacer');
  assert.equal(runEvent(4, 4), null, 'écran non noté : rien ne change');
  assert.deepEqual(Object.keys(RUN_MILESTONES).map(Number), [5, 10]);
});

test('comptage dans le lecteur : premières tentatives seulement, une erreur remet à zéro', () => {
  const screens = normalizeLesson({
    screens: Array.from({ length: 5 }, () => ({ type: 'choice', scored: true, payload: { question: 'q', options: [{ id: 'a', text: 'a', correct: true }] } })),
  }).screens;
  const answer = (screenIndex: number, correct: boolean) => ({ screenIndex, type: 'choice', correct, raw: 'a' });
  // Écran 2 raté puis rattrapé : le rattrapage ne compte pas
  const answers = [answer(0, true), answer(1, true), answer(2, false), answer(2, true), answer(3, true), answer(4, true)];
  assert.equal(firstTryRun(answers, screens), 2);
  assert.equal(firstTryRun(answers.slice(0, 2), screens), 2);
});

test('meilleure série d’une leçon et leçon parfaite', () => {
  assert.equal(bestRunOf([]), 0);
  assert.equal(bestRunOf([...ok(3), ko, ...ok(5), ko, ...ok(2)]), 5);
  assert.equal(bestRunOf(ok(7)), 7);
  assert.equal(isPerfectLesson({ correct: 6, total: 6 }), true);
  assert.equal(isPerfectLesson({ correct: 5, total: 6 }), false);
  assert.equal(isPerfectLesson({ correct: 0, total: 0 }), false, 'aucune question notée : pas parfaite');
});

test('défis : gagnés une seule fois, à la bonne leçon', () => {
  let record = EMPTY_ACCURACY;
  let r = applyLesson(record, { key: 'l1', bestRun: 4, perfect: false });
  assert.deepEqual(r.gained, []);
  record = r.record;

  r = applyLesson(record, { key: 'l2', bestRun: 6, perfect: true });
  assert.deepEqual(r.gained.map((c) => c.id), ['run-5', 'perfect-1']);
  record = r.record;
  assert.equal(record.bestRun, 6);

  // La même chose encore : rien de nouveau
  r = applyLesson(record, { key: 'l2', bestRun: 6, perfect: true });
  assert.deepEqual(r.gained, []);
  assert.deepEqual(r.record.perfectLessons, ['l2'], 'une leçon rejouée parfaite ne compte qu’une fois');

  // 20 d'affilée d'un coup : 10 et 20 ensemble
  r = applyLesson(record, { key: 'l3', bestRun: 21, perfect: false });
  assert.deepEqual(r.gained.map((c) => c.id), ['run-10', 'run-20']);
  record = r.record;
  assert.deepEqual(record.earned, ['run-5', 'perfect-1', 'run-10', 'run-20']);
  assert.equal(record.lessonBest.l3, 21);
  assert.equal(applyLesson(record, { key: 'l3', bestRun: 2, perfect: false }).record.lessonBest.l3, 21, 'meilleure série gardée');
});

test('défi des 10 leçons parfaites : 10 leçons différentes', () => {
  let record = EMPTY_ACCURACY;
  const gained: string[] = [];
  for (let i = 1; i <= 10; i++) {
    const r = applyLesson(record, { key: `l${i}`, bestRun: 3, perfect: true });
    record = r.record;
    gained.push(...r.gained.map((c) => c.id));
  }
  assert.deepEqual(gained, ['perfect-1', 'perfect-10']);
  assert.equal(record.perfectLessons.length, 10);
});

test('mémoire : lecture prudente, reprise de la mémoire sans compte', () => {
  assert.deepEqual(parseAccuracy(null), EMPTY_ACCURACY);
  assert.deepEqual(parseAccuracy({ bestRun: 'x', earned: ['run-5', 'inconnu', 3] }).earned, ['run-5']);
  const merged = mergeAccuracy(
    { bestRun: 4, lessonBest: { a: 4 }, perfectLessons: ['a'], earned: ['perfect-1'] },
    { bestRun: 7, lessonBest: { a: 2, b: 7 }, perfectLessons: ['a', 'b'], earned: ['run-5', 'perfect-1'] }
  );
  assert.deepEqual(merged, { bestRun: 7, lessonBest: { a: 4, b: 7 }, perfectLessons: ['a', 'b'], earned: ['perfect-1', 'run-5'] });
});

test('défis et libellés', () => {
  assert.deepEqual(CHALLENGES.map((c) => c.id), ['run-5', 'run-10', 'run-20', 'perfect-1', 'perfect-10']);
  assert.equal(challengeHeadline(findChallenge('run-10')!), 'Nouveau défi : 10\u00A0d’affilée\u00A0!');
  assert.equal(bestRunLine(7), 'Record : 7 bonnes réponses d’affilée');
  assert.equal(allTimeBestLine(12), 'Ton record : 12 bonnes réponses d’affilée');
  assert.equal(findChallenge('rien'), null);
});
