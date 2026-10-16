/// <reference types="node" />
// Lancer : npm test
// Profil : niveau, carnet de déclics et son test, mots découverts, rappel

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { discoveryLesson, OBJECTIVES } from '../src/lesson/discovery';
import { normalizeLesson } from '../src/lesson/normalize';
import { addDiscovered, discoveredCount, mergeDiscovered } from '../src/utils/discoveredWords';
import {
  addDeclic,
  BLANK,
  buildQuiz,
  type Declic,
  declicKeywords,
  groupByUniverse,
  mergeDeclics,
  plainDeclic,
  QUIZ_MAX,
  quizLesson,
} from '../src/utils/notebook';
import { levelA11y, levelFromXp, levelInfo, medalsEarned, serverObjective, truncateEmail } from '../src/utils/profile';
import { OBJECTIVE_REMINDERS, reminderMessageFor, REMINDER_MESSAGES } from '../src/utils/reminder';

test('niveau : formule du site, XP restants avant le niveau suivant', () => {
  // LessonCompletionService::levelFromXp : floor(xp / 200) + 1
  assert.equal(levelFromXp(0), 1);
  assert.equal(levelFromXp(199), 1);
  assert.equal(levelFromXp(200), 2);
  // 1 975 XP (maquette) : niveau 10, encore 25 XP (un niveau = 200 XP ;
  // « encore 225 XP » de la maquette n'est pas possible avec cette formule)
  const info = levelInfo(1975);
  assert.equal(info.level, 10);
  assert.equal(info.next, 11);
  assert.equal(info.remaining, 25);
  assert.ok(Math.abs(info.ratio - 175 / 200) < 1e-9);
  assert.equal(levelA11y(info), 'Niveau 10, encore 25 XP avant le niveau 11');
  assert.equal(levelA11y(levelInfo(1775)), 'Niveau 9, encore 25 XP avant le niveau 10');
  assert.equal(levelInfo(1825).remaining, 175);
  // Pile sur un palier : tout le niveau reste à faire
  assert.equal(levelInfo(400).remaining, 200);
  assert.equal(levelInfo(400).ratio, 0);
  // Valeurs illisibles
  assert.equal(levelInfo(-5).level, 1);
  assert.equal(levelInfo(Number.NaN).remaining, 200);
});

test('profil : e-mail tronqué, médailles gagnées, objectif accepté par le serveur', () => {
  assert.equal(truncateEmail('a@b.fr'), 'a@b.fr');
  assert.equal(truncateEmail('quentin-08@exemple-long.fr'), 'quentin-08@…');
  assert.equal(medalsEarned(6, 0), 1);
  assert.equal(medalsEarned(0, 30), 4);
  assert.equal(medalsEarned(0, 0), 0);
  assert.equal(serverObjective('investir'), 'investir');
  assert.equal(serverObjective('logement'), 'projet');
  assert.equal(serverObjective('crypto'), null);
  assert.equal(serverObjective('impots'), null);
});

const declic = (text: string, at: string, slug: string | null = 'bourse'): Declic => ({
  text,
  universeSlug: slug,
  universeName: slug ? slug.toUpperCase() : null,
  lessonTitle: `Leçon ${at}`,
  at,
});

test('carnet : chaque déclic n’entre qu’une seule fois', () => {
  let list: Declic[] = [];
  list = addDeclic(list, declic('Le [temps] fait plus que le [montant].', '2026-10-01'));
  // Leçon rejouée, phrase identique à la ponctuation, aux crochets et à la casse près
  list = addDeclic(list, declic('le temps fait plus que le montant', '2026-10-05'));
  assert.equal(list.length, 1);
  list = addDeclic(list, declic('Avec un [crédit], la [durée] change tout.', '2026-10-06', 'immobilier'));
  assert.equal(list.length, 2);
  // Le plus récent en tête
  assert.equal(plainDeclic(list[0].text), 'Avec un crédit, la durée change tout.');
  // Fusion du carnet sans compte : sans doublon
  const merged = mergeDeclics(list, [declic('Le temps fait plus que le montant.', '2026-09-01'), declic('Changer de [tranche].', '2026-10-07', 'impots')]);
  assert.equal(merged.length, 3);
  assert.deepEqual(merged.map((d) => d.at), ['2026-10-07', '2026-10-06', '2026-10-01']);
  // Groupés par univers, du plus récent au plus ancien
  assert.deepEqual(groupByUniverse(merged).map((g) => g.slug), ['impots', 'immobilier', 'bourse']);
});

test('déclics des leçons découvertes : mots clés marqués, phrase affichée sans crochets', () => {
  for (const objective of OBJECTIVES) {
    const lesson = discoveryLesson(objective);
    assert.ok(lesson.takeawayMarked, objective);
    assert.ok(declicKeywords(lesson.takeawayMarked!).length >= 1, objective);
    assert.ok(!/[[\]]/.test(lesson.takeaway ?? ''), `crochets affichés : ${objective}`);
    assert.equal(plainDeclic(lesson.takeawayMarked!), lesson.takeaway);
  }
  assert.deepEqual(declicKeywords('Le [temps] fait plus que le [montant]'), ['temps', 'montant']);
});

// Hasard reproductible
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

test('test : mot masqué, trois choix sans doublon, cinq questions au plus', () => {
  const carnet = OBJECTIVES.map((o, i) => declic(discoveryLesson(o).takeawayMarked!, `2026-10-0${i + 1}`));
  for (let seed = 1; seed <= 40; seed++) {
    const quiz = buildQuiz(carnet, seeded(seed));
    assert.equal(quiz.length, QUIZ_MAX);
    for (const q of quiz) {
      assert.ok(q.prompt.includes(BLANK), q.prompt);
      assert.ok(!/[[\]]/.test(q.prompt));
      assert.ok(!q.prompt.toLowerCase().includes(`${q.answer.toLowerCase()} `) || q.full.split(q.answer).length > 2);
      assert.equal(q.choices.length, 3);
      assert.ok(q.choices.includes(q.answer));
      const keys = q.choices.map((c) => c.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase());
      assert.equal(new Set(keys).size, 3, `doublon : ${q.choices.join(', ')}`);
      // La phrase complète se retrouve en remettant le mot
      assert.equal(q.prompt.replace(BLANK, q.answer), q.full);
    }
    // Jamais deux fois la même phrase
    assert.equal(new Set(quiz.map((q) => q.full)).size, quiz.length);
  }
});

test('test : moins de questions si le carnet est court, mots proches si besoin', () => {
  const one = buildQuiz([declic('Le [temps] fait plus que le montant.', '2026-10-01')], seeded(3));
  assert.equal(one.length, 1);
  assert.equal(one[0].answer, 'temps');
  assert.equal(one[0].choices.length, 3);
  assert.equal(buildQuiz([], seeded(1)).length, 0);
  // Déclic du serveur sans crochets : un mot clé deviné, jamais un mot courant
  const guessed = buildQuiz([declic('Un budget tenu protège toujours ta tranquillité.', '2026-10-02')], seeded(2));
  assert.equal(guessed.length, 1);
  assert.equal(guessed[0].answer, 'tranquillité');
});

test('test : joué dans le lecteur, une seule bonne réponse par question', () => {
  const carnet = OBJECTIVES.slice(0, 3).map((o, i) => declic(discoveryLesson(o).takeawayMarked!, `2026-10-0${i + 1}`));
  const quiz = buildQuiz(carnet, seeded(7));
  const lesson = normalizeLesson(quizLesson(quiz));
  assert.equal(lesson.screens.length, 3);
  lesson.screens.forEach((s, i) => {
    assert.equal(s.kind, 'choice');
    if (s.kind !== 'choice') return;
    assert.equal(s.question, quiz[i].prompt);
    assert.equal(s.options.filter((o) => o.correct).length, 1);
    assert.equal(s.options.find((o) => o.correct)!.text, quiz[i].answer);
  });
});

test('mots découverts : la première ouverture seulement, total du dictionnaire', () => {
  let words: string[] = [];
  words = addDiscovered(words, 'Inflation');
  words = addDiscovered(words, 'inflation');
  words = addDiscovered(words, 'Épargne');
  words = addDiscovered(words, 'epargne');
  words = addDiscovered(words, '  ');
  assert.deepEqual(words, ['Inflation', 'Épargne']);
  assert.equal(discoveredCount(words, null), 2);
  // Un mot retiré du dictionnaire ne compte plus
  assert.equal(discoveredCount(words, ['Inflation', 'Taux']), 1);
  assert.deepEqual(mergeDiscovered(['Taux'], words), ['Taux', 'Inflation', 'Épargne']);
});

test('rappel : un texte par objectif, un jour sur deux', () => {
  for (const o of OBJECTIVES) assert.ok(OBJECTIVE_REMINDERS[o]?.body, o);
  assert.match(OBJECTIVE_REMINDERS.investir.body, /Ta prochaine leçon sur l’investissement t’attend/);
  const days = Array.from({ length: 14 }, (_, i) => new Date(2026, 9, 1 + i));
  const withGoal = days.map((d) => reminderMessageFor(d, 'investir').body);
  assert.equal(withGoal.filter((b) => b === OBJECTIVE_REMINDERS.investir.body).length, 7);
  // Sans objectif : les textes habituels
  for (const d of days) assert.ok(REMINDER_MESSAGES.includes(reminderMessageFor(d, null)));
});
