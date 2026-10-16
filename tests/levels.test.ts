/// <reference types="node" />
// Lancer : npm test
// Niveaux d'un univers et tri des modules (utils/levels.ts)

import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { Module } from '../src/context/ApiContext';
import {
  ALL_MODULES_LABEL,
  currentLevelIndex,
  doneModulesLabel,
  levelGroups,
  levelIntro,
  levelKey,
  lockedMessage,
  moduleLessonsLabel,
  sortLevelModules,
  universePill,
} from '../src/utils/levels';

function mod(id: number, difficulty: string | null | undefined, done: boolean[]): Module {
  return {
    id,
    slug: `m${id}`,
    title: `Module ${id}`,
    difficulty: difficulty ?? undefined,
    lessons_count: done.length,
    lessons_completed: done.filter(Boolean).length,
    lessons: done.map((completed, i) => ({ id: id * 100 + i, slug: `l${i}`, title: 'L', xp_reward: 10, completed })),
  };
}

test('valeurs du serveur : cinq niveaux, synonymes, inconnus gardés', () => {
  assert.equal(levelKey('entree'), 'entree');
  assert.equal(levelKey('Intermédiaire'), 'inter');
  assert.equal(levelKey('intermediaire'), 'inter');
  assert.equal(levelKey('EXPERT'), 'expert');
  assert.equal(levelKey('beginner'), 'debutant');
  assert.equal(levelKey('legende'), 'legende');
  assert.equal(levelKey(''), null);
  assert.equal(levelKey(null), null);
});

test('niveaux dans l’ordre du site, plus de trois niveaux, déblocage en chaîne', () => {
  const modules = [
    mod(1, 'expert', [false]),
    mod(2, 'debutant', [true, true]),
    mod(3, 'entree', [true]),
    mod(4, 'inter', [true]),
    mod(5, 'inter', [false]),
    mod(6, 'avance', [false]),
  ];
  const groups = levelGroups(modules);
  assert.deepEqual(groups.map((g) => g.label), ['Entrée', 'Débutant', 'Intermédiaire', 'Avancé', 'Expert']);
  assert.deepEqual(groups.map((g) => g.unlocked), [true, true, true, false, false]);
  assert.deepEqual(groups.map((g) => g.completed), [true, true, false, false, false]);
  assert.equal(currentLevelIndex(groups), 2);
  assert.equal(lockedMessage(groups, 3), 'Termine le module Intermédiaire pour débloquer');
  assert.equal(lockedMessage(groups, 4), 'Termine le module Intermédiaire pour débloquer');
  assert.equal(lockedMessage(groups, 1), null);
});

test('message de déblocage : nombre de modules restants du niveau qui bloque', () => {
  const groups = levelGroups([mod(1, 'debutant', [false]), mod(2, 'debutant', [false]), mod(3, 'debutant', [true]), mod(4, 'inter', [false])]);
  assert.equal(lockedMessage(groups, 1), 'Termine les 2 modules Débutant pour débloquer');
});

test('un module sans niveau compte comme intermédiaire ; aucun niveau → « Tous les modules »', () => {
  const mixed = levelGroups([mod(1, 'debutant', [false]), mod(2, null, [false])]);
  assert.deepEqual(mixed.map((g) => g.key), ['debutant', 'inter']);
  const none = levelGroups([mod(1, null, [true]), mod(2, undefined, [false]), mod(3, null, [])]);
  assert.equal(none.length, 1);
  assert.equal(none[0].key, null);
  assert.equal(none[0].label, ALL_MODULES_LABEL);
  assert.equal(none[0].modules.length, 2, 'module sans leçon ignoré');
  assert.equal(none[0].unlocked, true);
});

test('tout terminé : le dernier niveau est ouvert', () => {
  const groups = levelGroups([mod(1, 'debutant', [true]), mod(2, 'inter', [true])]);
  assert.equal(currentLevelIndex(groups), 1);
});

test('tri des modules : en cours (plus récent d’abord), puis pas commencés, terminés à part', () => {
  const modules = [mod(1, 'inter', [false]), mod(2, 'inter', [true, false]), mod(3, 'inter', [true]), mod(4, 'inter', [true, false]), mod(5, 'inter', [false])];
  const dates: Record<number, string> = { 4: '2026-10-10T00:00:00Z' };
  const sorted = sortLevelModules(modules, (id) => dates[id] ?? null);
  assert.deepEqual(sorted.active.map((m) => m.id), [4, 2, 1, 5]);
  assert.deepEqual(sorted.done.map((m) => m.id), [3]);
  assert.deepEqual(sortLevelModules(modules).active.map((m) => m.id), [2, 4, 1, 5]);
});

test('libellés de la page d’un univers', () => {
  assert.equal(levelIntro(7), '7 modules · fais-les dans l’ordre que tu veux');
  assert.equal(levelIntro(1), '1 module dans ce niveau');
  assert.equal(doneModulesLabel(2, true), '2 modules terminés dans ce niveau');
  assert.equal(doneModulesLabel(1, false), '1 module terminé');
  assert.equal(moduleLessonsLabel(mod(1, 'inter', [true, true, false, false, false])), '2 sur 5 leçons');
  assert.equal(moduleLessonsLabel(mod(1, 'inter', [false, false, false, false])), '4 leçons');
});

test('pastille d’un univers : à découvrir, niveau en cours, terminé', () => {
  assert.equal(universePill([mod(1, 'debutant', [false])]).label, 'À découvrir');
  assert.deepEqual(universePill([mod(1, 'debutant', [true]), mod(2, 'inter', [false])]), { label: 'Intermédiaire', level: 'inter' });
  assert.equal(universePill([mod(1, 'debutant', [true])]).label, 'Terminé');
  assert.equal(universePill([mod(1, null, [true, false])]).label, 'En cours');
});
