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
  nothingDueLabel,
  parseServerRevision,
  pickDeclicExtras,
  pickRevision,
  recordLessonResults,
  recordResults,
  revisionLesson,
  revisionSize,
  revisionVerdict,
  screenKey,
  seededRandom,
  type ServerRevision,
  serverResponses,
  serverRevisionLesson,
  serverRevisionUsable,
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

test('matière : un écran marqué review: false n’est jamais rejoué, même gardé avant la correction', () => {
  const horsLecon = { ...choice('seul'), review: false };
  assert.deepEqual(gradableScreens([choice('a'), horsLecon, choice('b')]).map((s) => s.index), [0, 2]);
  // Leçon gardée sur le téléphone avant que review: false soit respecté
  const old = lesson(9, 'crypto', 2);
  old.screens.push({ index: 2, raw: horsLecon });
  const keys = buildCandidates({ lessons: [old], declics: [], history: {}, lessonDoneAt: () => null, random: fixed }).map((c) => c.key);
  assert.deepEqual(keys, ['e:9:0', 'e:9:1']);
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

// ---------------------------------------------------------------------------
// Révision du serveur
// ---------------------------------------------------------------------------

test('réponse du serveur : une session, l’état vide, ou une forme inattendue', () => {
  const session = parseServerRevision({
    session: { id: 'abc', screens: [choice('a'), choice('b')], items: [{ notion: 'n1', notion_nom: 'Notion 1', lesson_title: 'L', due: true }] },
    empty: null,
  });
  assert.equal(session?.session?.id, 'abc');
  assert.equal(session?.session?.screens.length, 2);
  assert.deepEqual(session?.session?.notions[0], { notion: 'n1', name: 'Notion 1', lessonTitle: 'L', due: true });

  const empty = parseServerRevision({ session: null, empty: { has_notions: true, next: { date: '2026-10-17', count: 2, in_days: 1, label: 'demain' } } });
  assert.deepEqual(empty, { session: null, empty: { hasNotions: true, nextLabel: 'demain' } });
  assert.deepEqual(parseServerRevision({ session: null, empty: { has_notions: false, next: null } })?.empty, { hasNotions: false, nextLabel: null });

  assert.equal(parseServerRevision(null), null);
  assert.equal(parseServerRevision({ message: 'Unauthenticated.' }), null);
  assert.equal(parseServerRevision({ session: { screens: [] } }), null);
});

function record(extra: Partial<ServerRevision> = {}): ServerRevision {
  return {
    day: '2026-10-16',
    fetchedAt: '2026-10-16T08:00:00Z',
    session: { id: 's1', screens: [choice('a'), choice('b'), choice('c')], notions: [] },
    empty: null,
    extras: [],
    done: null,
    ...extra,
  };
}

test('la session du serveur sert toute la journée, jusqu’à 5 h 30 (le serveur la garde 6 h)', () => {
  const at = (h: string) => new Date(`2026-10-16T${h}:00Z`);
  assert.equal(serverRevisionUsable(record(), '2026-10-16', at('13:00')), true);
  assert.equal(serverRevisionUsable(record(), '2026-10-16', at('13:31')), false);
  assert.equal(serverRevisionUsable(record({ done: { at: 'x', correct: 1, total: 2, xp: 10, streak: 3, counted: true } }), '2026-10-16', at('23:00')), true);
  assert.equal(serverRevisionUsable(record({ session: null, empty: { hasNotions: true, nextLabel: 'demain' } }), '2026-10-16', at('23:00')), true);
  assert.equal(serverRevisionUsable(record(), '2026-10-17', at('09:00')), false, 'un autre jour');
  assert.equal(serverRevisionUsable(null, '2026-10-16', at('09:00')), false);
});

test('déclics ajoutés : 2 au plus, ratés d’abord, rien de la veille sauf raté', () => {
  const d = (text: string, at: string): Declic => ({ text, universeSlug: 'bourse', universeName: 'Bourse', lessonTitle: null, at });
  const declics = [d('Le [temps] compte', '2026-10-01T00:00:00Z'), d('Le [risque] se paie', '2026-10-02T00:00:00Z'), d('La [diversification] protège', '2026-10-03T00:00:00Z')];
  const history = recordResults({}, [{ key: 'd:La [diversification] protège', correct: false }], '2026-10-10T00:00:00Z');
  const extras = pickDeclicExtras({ declics, history, yesterdayKeys: ['d:Le [temps] compte'], random: fixed });
  assert.deepEqual(extras.map((e) => e.key), ['d:La [diversification] protège', 'd:Le [risque] se paie']);
  assert.ok(extras.every((e) => e.kind === 'declic'));
  assert.deepEqual(pickDeclicExtras({ declics: [], history: {}, yesterdayKeys: [], random: fixed }), []);
});

test('écrans joués : ceux du serveur d’abord, puis les déclics ; /complete ne reçoit que les positions du serveur', () => {
  const rec = record({
    extras: [
      {
        key: 'd:x',
        kind: 'declic',
        universe: null,
        question: { prompt: 'Le _____ compte', answer: 'temps', choices: ['temps', 'prix', 'risque'], full: 'Le temps compte', lessonTitle: null },
      },
    ],
  });
  const built = serverRevisionLesson(rec);
  assert.equal(built.serverCount, 3);
  assert.equal(built.screens.length, 4);
  assert.deepEqual(built.extraKeys, ['d:x']);
  const model = normalizeLesson({ title: built.title, screens: built.screens });
  assert.ok(model.screens.every((s) => s.kind === 'choice' && s.scored));
  assert.deepEqual(serverResponses({ '0': ['a'], '2': ['b', 'a'], '3': ['c0'], x: ['?'] }, 3), { '0': ['a'], '2': ['b', 'a'] });
});

test('rien à réviser : phrase avec la prochaine révision', () => {
  assert.equal(nothingDueLabel('demain'), 'Rien à réviser aujourd’hui. Prochaine révision : demain.');
  assert.equal(nothingDueLabel(null), 'Rien à réviser aujourd’hui.');
});
