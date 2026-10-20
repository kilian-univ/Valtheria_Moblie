/// <reference types="node" />
// Lancer : npm test
// Programme du jour de l'accueil d'Apprendre (utils/dailyProgram.ts)

import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { Module } from '../src/context/ApiContext';
import type { Universe } from '../src/lesson/model';
import {
  carouselOrder,
  type LessonLogEntry,
  pickLessonOfDay,
  programCounter,
  programState,
  revisionLabel,
  revisionMinutes,
} from '../src/utils/dailyProgram';
import { visibleUniverses } from '../src/utils/universes';

function mod(id: number, done: boolean[], difficulty: string | undefined = 'debutant'): Module {
  return {
    id,
    slug: `m${id}`,
    title: `Module ${id}`,
    difficulty,
    lessons_count: done.length,
    lessons_completed: done.filter(Boolean).length,
    lessons: done.map((completed, i) => ({ id: id * 100 + i, slug: `l${i}`, title: `L${id}-${i}`, xp_reward: 10, completed })),
  };
}

function uni(id: number, slug: string, moduleIds: number[]): Universe {
  return { id, slug, name: slug, description: null, position: id, moduleIds };
}

const log = (moduleId: number, at: string): LessonLogEntry => ({ lessonId: moduleId * 100, moduleId, at, day: at.slice(0, 10) });

test('leçon du jour : le module en cours le plus récent d’abord', () => {
  const modules = [mod(1, [true, false]), mod(2, [true, false, false]), mod(3, [false])];
  const universes = [uni(1, 'bourse', [1, 3]), uni(2, 'crypto', [2])];
  const pick = pickLessonOfDay({
    modules,
    universes,
    log: [log(1, '2026-10-10T10:00:00Z'), log(2, '2026-10-12T10:00:00Z')],
    lastModuleId: 1,
    objectiveSlug: 'bourse',
  });
  assert.equal(pick?.module.id, 2);
  assert.equal(pick?.lesson.id, 201);
  assert.equal(pick?.universe?.slug, 'crypto');
});

test('leçon du jour : sans date, le dernier module ouvert en cours, puis l’ordre du serveur', () => {
  const modules = [mod(1, [true, false]), mod(2, [true, false])];
  const universes = [uni(1, 'bourse', [1, 2])];
  assert.equal(pickLessonOfDay({ modules, universes, log: [], lastModuleId: 2, objectiveSlug: null })?.module.id, 2);
  assert.equal(pickLessonOfDay({ modules, universes, log: [], lastModuleId: 99, objectiveSlug: null })?.module.id, 1);
});

test('leçon du jour : rien en cours → premier module disponible de l’univers de l’objectif', () => {
  const modules = [mod(1, [false]), mod(2, [true]), mod(3, [false], 'inter'), mod(4, [false])];
  const universes = [uni(1, 'bourse', [1]), uni(2, 'crypto', [2, 3]), uni(3, 'impots', [4])];
  // crypto : niveau débutant terminé, l'intermédiaire est débloqué
  assert.equal(pickLessonOfDay({ modules, universes, log: [], lastModuleId: null, objectiveSlug: 'crypto' })?.module.id, 3);
});

test('leçon du jour : un module d’un niveau verrouillé n’est jamais proposé', () => {
  const modules = [mod(1, [true, false], 'debutant'), mod(2, [false], 'inter'), mod(3, [false])];
  // le module 1 est en cours : il passe d'abord ; on le termine pour voir la suite
  const finished = [mod(1, [true, false], 'debutant'), mod(2, [false], 'avance'), mod(5, [false], 'debutant'), mod(3, [false])];
  const universes = [uni(1, 'crypto', [1, 2, 5]), uni(2, 'bourse', [3])];
  assert.equal(pickLessonOfDay({ modules, universes, log: [], lastModuleId: null, objectiveSlug: 'crypto' })?.module.id, 1);
  const noStarted = finished.map((m) => (m.id === 1 ? mod(1, [false, false], 'debutant') : m));
  assert.equal(pickLessonOfDay({ modules: noStarted, universes, log: [], lastModuleId: null, objectiveSlug: 'crypto' })?.module.id, 1);
});

test('leçon du jour : objectif terminé → premier univers qui a des leçons ; tout fini → null', () => {
  const modules = [mod(1, [true]), mod(2, [false]), mod(3, [false])];
  const universes = [uni(1, 'bourse', [1]), uni(2, 'crypto', []), uni(3, 'impots', [2]), uni(4, 'se-loger', [3])];
  assert.equal(pickLessonOfDay({ modules, universes, log: [], lastModuleId: null, objectiveSlug: 'bourse' })?.module.id, 2);
  assert.equal(pickLessonOfDay({ modules: [mod(1, [true])], universes, log: [], lastModuleId: null, objectiveSlug: 'bourse' }), null);
});

test('leçon du jour : sans univers, le premier module non terminé', () => {
  const modules = [mod(1, [true]), mod(2, [false])];
  assert.equal(pickLessonOfDay({ modules, universes: [], log: [], lastModuleId: null, objectiveSlug: 'bourse' })?.module.id, 2);
});

test('programme du jour : phrases de Val et compteur', () => {
  assert.deepEqual(
    [programState(false, false), programState(true, false), programState(true, true)].map((p) => [p.count, p.line]),
    [
      [0, 'Une leçon, une révision, et ta journée est faite.'],
      [1, 'Bien joué ! Plus que la révision.'],
      [2, 'Journée terminée. À demain !'],
    ]
  );
  assert.equal(programState(true, true).mood, 'celebrant');
  assert.equal(programState(false, true).count, 1);
  assert.equal(programCounter(1), '1\u00A0sur\u00A02');
});

test('révision : durée estimée (25 s par écran, minute supérieure)', () => {
  assert.equal(revisionMinutes(0), 0);
  assert.equal(revisionMinutes(1), 1);
  assert.equal(revisionMinutes(4), 2);
  assert.equal(revisionMinutes(5), 3);
  assert.equal(revisionMinutes(10), 5);
  assert.equal(revisionLabel(6), '6\u00A0écrans · environ\u00A03\u00A0min');
  assert.equal(revisionLabel(1), '1\u00A0écran · environ\u00A01\u00A0min');
});

test('carrousel : objectif, puis en cours du plus récent au plus ancien, puis les autres', () => {
  const modules = [mod(1, [true, false]), mod(2, [true, false]), mod(3, [false]), mod(4, [false]), mod(5, [true, false])];
  const universes = [uni(1, 'a', [1]), uni(2, 'b', [2]), uni(3, 'c', [3]), uni(4, 'objectif', [4]), uni(5, 'e', [5])];
  const entries = visibleUniverses(universes, modules);
  const order = carouselOrder(entries, 'objectif', [log(1, '2026-10-01T08:00:00Z'), log(2, '2026-10-05T08:00:00Z')]);
  // b (plus récent), a, puis e (en cours sans date), puis c (pas commencé)
  assert.deepEqual(
    order.map((e) => e.universe.slug),
    ['objectif', 'b', 'a', 'e', 'c']
  );
  // Univers terminé : avec les autres, dans l'ordre du serveur
  const done = carouselOrder(visibleUniverses([uni(1, 'fini', [1]), uni(2, 'neuf', [2])], [mod(1, [true]), mod(2, [false])]), null, []);
  assert.deepEqual(done.map((e) => e.universe.slug), ['fini', 'neuf']);
});

test('programme du jour sans leçon disponible : la révision seule, sur 1', () => {
  const todo = programState(false, false, false);
  assert.deepEqual([todo.count, todo.total, todo.dayDone, todo.line], [0, 1, false, 'Une petite révision pour garder le rythme ?']);
  assert.equal(programCounter(todo.count, todo.total), '0\u00A0sur\u00A01');
  const done = programState(false, true, false);
  assert.deepEqual([done.count, done.total, done.dayDone, done.line], [1, 1, true, 'Révision faite, à demain !']);
  // La dernière leçon faite aujourd'hui compte toujours
  const last = programState(true, false, false);
  assert.deepEqual([last.count, last.total, last.dayDone], [1, 2, false]);
  assert.equal(programState(true, true, false).dayDone, true);
  // Avec une leçon disponible : sur 2, journée faite avec les deux
  assert.deepEqual([programState(false, true).total, programState(false, true).dayDone], [2, false]);
});
