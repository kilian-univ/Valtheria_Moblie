/// <reference types="node" />
// Lancer : npm test
// Récompenses de la série (utils/streakRewards.ts)

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { recordLessonDone } from '../src/utils/discoveryHome';
import { INITIAL_ONBOARDING, parseOnboarding } from '../src/utils/onboarding';
import {
  earnedMedals,
  FREEZE_MAX,
  freezesLabel,
  frozenYesterday,
  medalToCelebrate,
  MEDALS,
  nextMedal,
  nextRewardLabel,
  simulatedLessonDays,
  simulateStreak,
  weekDays,
} from '../src/utils/streakRewards';

// Samedi 10 octobre 2026, 21 h
const NOW = new Date(2026, 9, 10, 21, 0);
const day = (offset: number) => {
  const d = new Date(2026, 9, 10 + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
// Jours de leçon de offset a à offset b (inclus)
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => day(a + i));

// ---------------------------------------------------------------------------
// Semaine
// ---------------------------------------------------------------------------
test('semaine : avant le début discret, manqué, série, sauvé par un gel, aujourd’hui', () => {
  // Première leçon mercredi ; jeudi manqué ; vendredi faite ; aujourd'hui pas encore
  const week = weekDays([day(-3), day(-1)], NOW);
  assert.deepEqual(
    week.map((d) => d.state),
    ['quiet', 'quiet', 'done', 'missed', 'done', 'today', 'quiet']
  );
  assert.equal(week[5].isToday, true);
  // Aucune leçon : jamais de jour « manqué »
  assert.deepEqual(
    weekDays([], NOW).map((d) => d.state),
    ['quiet', 'quiet', 'quiet', 'quiet', 'quiet', 'today', 'quiet']
  );
  // Aujourd'hui fait : jour de série, toujours entouré
  const today = weekDays([day(0)], NOW)[5];
  assert.deepEqual([today.state, today.isToday], ['done', true]);
  // Gel : 7 jours jusqu'à avant-hier, hier manqué → sauvé
  const frozen = weekDays(range(-8, -2), NOW);
  assert.equal(frozen[4].state, 'frozen');
  assert.equal(frozen[3].state, 'done');
});

// ---------------------------------------------------------------------------
// Gels
// ---------------------------------------------------------------------------
test('gels : un à 7 jours, un de plus tous les 7 jours, 2 au plus', () => {
  assert.equal(simulateStreak(range(-5, 0), NOW).freezes, 0);
  assert.equal(simulateStreak(range(-6, 0), NOW).freezes, 1);
  assert.equal(simulateStreak(range(-13, 0), NOW).freezes, 2);
  assert.equal(simulateStreak(range(-27, 0), NOW).freezes, FREEZE_MAX);
  assert.equal(FREEZE_MAX, 2);
});

test('gels : utilisés tout seuls, un par jour manqué, la série continue', () => {
  // 7 jours puis hier manqué : le gel sauve, la série tient à 7
  const one = simulateStreak(range(-8, -2), NOW);
  assert.deepEqual([one.streak, one.freezes, one.frozenDays], [7, 0, [day(-1)]]);
  assert.equal(frozenYesterday(one, NOW), true);
  // Aujourd'hui fait ensuite : 8
  assert.equal(simulateStreak([...range(-8, -2), day(0)], NOW).streak, 8);
  // 14 jours (2 gels), puis 2 jours manqués : les deux gels partent
  const two = simulateStreak(range(-16, -3), NOW);
  assert.deepEqual([two.streak, two.freezes, two.frozenDays], [14, 0, [day(-2), day(-1)]]);
  // 3 jours manqués avec 2 gels : la série repart à zéro
  const broken = simulateStreak(range(-17, -4), NOW);
  assert.equal(broken.streak, 0);
  assert.equal(broken.best, 14);
  // Sans gel : la série repart à zéro comme avant
  const none = simulateStreak(range(-5, -2), NOW);
  assert.deepEqual([none.streak, none.frozenDays], [0, []]);
  assert.equal(frozenYesterday(none, NOW), false);
  // Aujourd'hui sans leçon : pas un jour manqué (la série tient jusqu'à minuit)
  assert.equal(simulateStreak(range(-3, -1), NOW).streak, 3);
});

test('gels : la série sauvée garde son rythme de gain', () => {
  // 7 jours, un jour sauvé, puis 7 jours : 14 → nouveau gel
  const days = [...range(-15, -9), ...range(-7, -1)];
  const h = simulateStreak(days, NOW);
  assert.deepEqual([h.streak, h.frozenDays, h.freezes], [14, [day(-8)], 1]);
  assert.equal(freezesLabel(1), '1 gel');
  assert.equal(freezesLabel(2), '2 gels');
});

// ---------------------------------------------------------------------------
// Médailles et prochaine récompense
// ---------------------------------------------------------------------------
test('paliers : Étincelle, Feu de camp, Brasier, Flamme d’or, Phénix, Légende', () => {
  assert.deepEqual(
    MEDALS.map((m) => [m.days, m.name]),
    [
      [3, 'Étincelle'],
      [7, 'Feu de camp'],
      [14, 'Brasier'],
      [30, 'Flamme d’or'],
      [60, 'Phénix'],
      [100, 'Légende'],
    ]
  );
});

test('prochaine récompense et accords', () => {
  assert.equal(nextRewardLabel(0), 'Termine une leçon pour allumer ta flamme');
  assert.equal(nextRewardLabel(1), 'Étincelle dans 2 jours');
  assert.equal(nextRewardLabel(2), 'Étincelle dans 1 jour');
  assert.equal(nextRewardLabel(3), 'Feu de camp dans 4 jours');
  assert.equal(nextRewardLabel(6), 'Feu de camp dans 1 jour');
  assert.equal(nextRewardLabel(29), 'Flamme d’or dans 1 jour');
  assert.equal(nextRewardLabel(99), 'Légende dans 1 jour');
  assert.equal(nextRewardLabel(100), 'Ta flamme est à son maximum');
  assert.equal(nextRewardLabel(250), 'Ta flamme est à son maximum');
  assert.equal(nextMedal(13)?.name, 'Brasier');
  assert.equal(nextMedal(100), null);
});

test('médailles gagnées conservées après une série cassée', () => {
  // 30 jours, puis cassée (3 jours manqués avec 2 gels), puis 2 jours
  const days = [...range(-40, -11), ...range(-6, -5)];
  const h = simulateStreak(days, NOW);
  assert.equal(h.streak, 0);
  assert.equal(h.best, 30);
  assert.deepEqual(
    earnedMedals(h.best).map((m) => m.name),
    ['Étincelle', 'Feu de camp', 'Brasier', 'Flamme d’or']
  );
  // Meilleure série mémorisée même si les jours ne sont plus là
  const state = { ...INITIAL_ONBOARDING, bestStreak: 60 };
  const done = recordLessonDone(state, 'crypto', NOW);
  assert.equal(done.patch.bestStreak, 60);
  assert.equal(earnedMedals(done.patch.bestStreak).length, 5);
  assert.equal(parseOnboarding({ bestStreak: 14 }).bestStreak, 14);
  assert.equal(parseOnboarding({ bestStreak: -3 }).bestStreak, 0);
});

// ---------------------------------------------------------------------------
// Célébration de palier
// ---------------------------------------------------------------------------
test('célébration : le palier franchi par la leçon, une seule fois', () => {
  assert.equal(medalToCelebrate(2, 3, []).medal?.name, 'Étincelle');
  assert.equal(medalToCelebrate(3, 4, []).medal, null);
  assert.equal(medalToCelebrate(2, 3, [3]).medal, null);
  // Plusieurs paliers d'un coup : le plus haut, tous mémorisés
  assert.deepEqual(medalToCelebrate(0, 8, []), { medal: MEDALS[1], crossed: [3, 7] });

  // Par la fin de leçon sans compte : 6 jours jusqu'à hier, leçon du jour → 7
  let state = { ...INITIAL_ONBOARDING, lessonDays: simulatedLessonDays(6, NOW) };
  const first = recordLessonDone(state, 'crypto', NOW);
  assert.equal(first.medal?.name, 'Feu de camp');
  assert.equal(first.freezeGained, true);
  assert.deepEqual(first.patch.celebratedMedals, [7]);
  // Deuxième leçon le même jour : rien de plus
  state = { ...state, ...first.patch };
  const second = recordLessonDone(state, 'impots', NOW);
  assert.equal(second.medal, null);
  assert.equal(second.freezeGained, false);
  // Série cassée puis de nouveau 7 jours plus tard : pas de deuxième fête
  const again = recordLessonDone(
    { ...INITIAL_ONBOARDING, lessonDays: simulatedLessonDays(6, NOW), celebratedMedals: [3, 7] },
    'crypto',
    NOW
  );
  assert.equal(again.medal, null);
  assert.equal(parseOnboarding({ celebratedMedals: [7, 3, 7, 5, 'x'] }).celebratedMedals.join(','), '3,7');
});

test('développement : séries simulées finissant hier, ou avant-hier avec un gel', () => {
  assert.equal(simulateStreak(simulatedLessonDays(29, NOW), NOW).streak, 29);
  assert.equal(simulateStreak(simulatedLessonDays(99, NOW), NOW).streak, 99);
  const frozen = simulateStreak(simulatedLessonDays(29, NOW, true), NOW);
  assert.deepEqual([frozen.streak, frozen.freezes, frozenYesterday(frozen, NOW)], [29, 1, true]);
  // Leçon du jour : 30, Flamme d'or
  const done = recordLessonDone({ ...INITIAL_ONBOARDING, lessonDays: simulatedLessonDays(29, NOW), celebratedMedals: [3, 7, 14] }, null, NOW);
  assert.equal(done.medal?.name, 'Flamme d’or');
});
