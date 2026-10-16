/// <reference types="node" />
// Lancer : npm test
// Révision quotidienne (utils/revision.ts)

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { normalizeLesson } from '../src/lesson/normalize';
import type { Declic } from '../src/utils/notebook';
import {
  buildCandidates,
  type CachedLesson,
  type Candidate,
  gradableScreens,
  pickRevision,
  recordLessonResults,
  recordResults,
  revisionLesson,
  revisionSize,
  revisionVerdict,
  screenKey,
  seededRandom,
} from '../src/utils/revision';

const choice = (q: string) => ({
  type: 'choice',
  scored: true,
  payload: { question: q, mode: 'single', options: [{ id: 'a', text: 'Oui', correct: true }, { id: 'b', text: 'Non' }] },
});
const pari = { type: 'slider', scored: false, payload: { min: 0, max: 10, step: 1, start: 5 } };
const reveal = { type: 'reveal', scored: false, payload: { value: 10, lines: [] } };
const simulator = { type: 'simulator', scored: false, payload: { label: 'x', min: 0, max: 1, step: 1, start: 0, formula: 'savings_from_age' } };

function lesson(id: number, universe: string, count = 3): CachedLesson {
  return {
    lessonId: id,
    title: `Leçon ${id}`,
    universeSlug: universe,
    screens: Array.from({ length: count }, (_, i) => ({ index: i, raw: choice(`${id}-${i}`) })),
    at: '2026-10-01T00:00:00Z',
  };
}

function cand(key: string, universe: string, lastSeen: string | null, failed = false): Candidate {
  return { key, universe, failed, lastSeen, item: { key, kind: 'screen', lessonId: 1, index: 0, universe } };
}

const fixed = () => 0.42;

test('matière : seuls les écrans notés rejouables (pas le pari, la révélation ni le simulateur)', () => {
  const screens = gradableScreens([pari, choice('a'), reveal, simulator, choice('b'), null]);
  assert.deepEqual(screens.map((s) => s.index), [1, 4]);
  assert.deepEqual(gradableScreens('rien'), []);
});

test('nombre d’écrans variable : de 4 à 10 selon les leçons faites, moins si peu de matière', () => {
  assert.equal(revisionSize(0, 50), 4);
  assert.equal(revisionSize(2, 50), 4);
  assert.equal(revisionSize(3, 50), 5);
  assert.equal(revisionSize(9, 50), 7);
  assert.equal(revisionSize(18, 50), 10);
  assert.equal(revisionSize(60, 50), 10);
  assert.equal(revisionSize(18, 3), 3);
  assert.equal(revisionSize(5, 0), 0);
});

test('priorités : ratés d’abord, puis les plus anciens', () => {
  const list = [
    cand('neuf', 'a', '2026-10-15T00:00:00Z'),
    cand('vieux', 'a', '2026-09-01T00:00:00Z'),
    cand('rate', 'a', '2026-10-14T00:00:00Z', true),
    cand('moyen', 'a', '2026-10-01T00:00:00Z'),
    cand('autre', 'a', '2026-10-10T00:00:00Z'),
  ];
  const picked = pickRevision({ candidates: list, lessonsDone: 0, yesterday: null, random: fixed });
  assert.equal(picked.length, 4);
  assert.equal(picked[0].key, 'rate');
  assert.deepEqual(new Set(picked.map((c) => c.key)), new Set(['rate', 'vieux', 'moyen', 'autre']));
});

test('univers mélangés : un écran de chaque univers avant d’en reprendre un', () => {
  const list = [
    ...Array.from({ length: 6 }, (_, i) => cand(`a${i}`, 'a', `2026-09-0${i + 1}T00:00:00Z`)),
    cand('b0', 'b', '2026-10-10T00:00:00Z'),
    cand('c0', 'c', '2026-10-11T00:00:00Z'),
  ];
  const picked = pickRevision({ candidates: list, lessonsDone: 0, yesterday: null, random: fixed });
  assert.equal(picked.length, 4);
  assert.ok(picked.some((c) => c.key === 'b0') && picked.some((c) => c.key === 'c0'));
  // Jamais deux fois le même univers à la suite quand on peut l'éviter
  for (let i = 1; i < picked.length; i++) {
    if (picked.filter((c) => c.universe === 'a').length <= 2) assert.notEqual(picked[i].universe, picked[i - 1].universe);
  }
});

test('pas de doublon, même si un écran est proposé deux fois', () => {
  const list = [cand('x', 'a', null), cand('x', 'a', null), cand('y', 'b', null), cand('z', 'c', null), cand('w', 'd', null)];
  const picked = pickRevision({ candidates: list, lessonsDone: 0, yesterday: null, random: fixed });
  assert.equal(new Set(picked.map((c) => c.key)).size, picked.length);
  assert.equal(picked.length, 4);
});

test('jamais un écran de la veille, sauf s’il a été raté', () => {
  const list = [
    cand('hier-reussi', 'a', '2026-09-01T00:00:00Z'),
    cand('hier-rate', 'a', '2026-10-15T00:00:00Z', true),
    cand('n1', 'b', '2026-10-01T00:00:00Z'),
    cand('n2', 'c', '2026-10-02T00:00:00Z'),
    cand('n3', 'd', '2026-10-03T00:00:00Z'),
  ];
  const picked = pickRevision({
    candidates: list,
    lessonsDone: 0,
    yesterday: { keys: ['hier-reussi', 'hier-rate'] },
    random: fixed,
  });
  const keys = picked.map((c) => c.key);
  assert.ok(!keys.includes('hier-reussi'));
  assert.ok(keys.includes('hier-rate'));
  assert.equal(keys[0], 'hier-rate');
});

test('peu de matière : moins de 4 écrans ; aucune : révision vide', () => {
  assert.equal(pickRevision({ candidates: [cand('a', 'a', null), cand('b', 'a', null)], lessonsDone: 10, yesterday: null, random: fixed }).length, 2);
  assert.deepEqual(pickRevision({ candidates: [], lessonsDone: 10, yesterday: null, random: fixed }), []);
});

test('candidats : écrans des leçons gardées et déclics ; ratés et dates d’après l’historique', () => {
  const declics: Declic[] = [
    { text: 'Le [temps] fait plus que le montant', universeSlug: 'bourse', universeName: 'Bourse', lessonTitle: 'L', at: '2026-10-02T00:00:00Z' },
    { text: 'Sans mot clé', universeSlug: null, universeName: null, lessonTitle: null, at: '2026-10-02T00:00:00Z' },
  ];
  let history = recordLessonResults({}, 7, [{ index: 0, correct: false }, { index: 1, correct: true }], '2026-10-05T00:00:00Z');
  history = recordResults(history, [{ key: screenKey(7, 1), correct: true }], '2026-10-12T00:00:00Z');
  const list = buildCandidates({
    lessons: [lesson(7, 'crypto', 3)],
    declics,
    history,
    lessonDoneAt: () => '2026-10-04T00:00:00Z',
    random: seededRandom('x'),
  });
  const byKey = Object.fromEntries(list.map((c) => [c.key, c]));
  assert.equal(byKey['e:7:0'].failed, true);
  assert.equal(byKey['e:7:1'].lastSeen, '2026-10-12T00:00:00Z');
  assert.equal(byKey['e:7:2'].lastSeen, '2026-10-04T00:00:00Z');
  assert.equal(byKey['d:Le [temps] fait plus que le montant'].universe, 'bourse');
  // « Sans mot clé » : « clé » trop court, aucun mot de 5 lettres hors mots courants → écarté
  assert.equal(list.length, 4);
});

test('la même révision toute la journée : tirage reproductible pour un jour donné', () => {
  const list = Array.from({ length: 20 }, (_, i) => cand(`k${i}`, `u${i % 4}`, '2026-10-01T00:00:00Z'));
  const a = pickRevision({ candidates: list, lessonsDone: 12, yesterday: null, random: seededRandom('42|2026-10-16') });
  const b = pickRevision({ candidates: list, lessonsDone: 12, yesterday: null, random: seededRandom('42|2026-10-16') });
  assert.deepEqual(a.map((c) => c.key), b.map((c) => c.key));
  assert.equal(a.length, 8);
});

test('leçon de révision : écrans gardés et questions de déclics, au format du lecteur', () => {
  const lessons = [lesson(7, 'crypto', 2)];
  const built = revisionLesson(
    [
      { key: 'e:7:1', kind: 'screen', lessonId: 7, index: 1, universe: 'crypto' },
      { key: 'e:9:0', kind: 'screen', lessonId: 9, index: 0, universe: 'x' },
      {
        key: 'd:x',
        kind: 'declic',
        universe: null,
        question: { prompt: 'Le _____ compte', answer: 'temps', choices: ['temps', 'prix', 'risque'], full: 'Le temps compte', lessonTitle: null },
      },
    ],
    lessons
  );
  assert.deepEqual(built.keys, ['e:7:1', 'd:x']);
  const model = normalizeLesson({ title: built.title, screens: built.screens });
  assert.equal(model.screens.length, 2);
  assert.ok(model.screens.every((s) => s.kind === 'choice' && s.scored));
});

test('bilan de Val', () => {
  assert.equal(revisionVerdict(4, 5, true).line, 'Journée terminée. À demain !');
  assert.equal(revisionVerdict(5, 5, false).mood, 'celebrant');
  assert.equal(revisionVerdict(3, 5, false).mood, 'fier');
  assert.equal(revisionVerdict(1, 5, false).mood, 'rassurant');
});
