/// <reference types="node" />
// Lancer : npm test

import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { Module } from '../src/context/ApiContext';
import { DISCOVERY, discoveryLesson, discoveryPlan, nextLessonTitle, OBJECTIVE_OPTIONS, OBJECTIVES } from '../src/lesson/discovery';
import type { Universe } from '../src/lesson/model';
import { normalizeLesson } from '../src/lesson/normalize';
import {
  emailValid,
  INITIAL_ONBOARDING,
  parseOnboarding,
  passwordValid,
  PASSWORD_RULES,
  pseudoError,
  routeForStep,
  shouldShowOnboarding,
  signupError,
} from '../src/utils/onboarding';
import {
  clampTime,
  formatTime,
  REMINDER_MESSAGES,
  REMINDER_SLOTS,
  reminderMessageFor,
  upcomingReminders,
} from '../src/utils/reminder';

// ---------------------------------------------------------------------------
// Leçons découvertes
// ---------------------------------------------------------------------------
test('six objectifs, chacun avec une option, une leçon, un univers, une prochaine leçon et une phrase de Val', () => {
  assert.deepEqual([...OBJECTIVES], ['comprendre', 'epargner', 'investir', 'projet', 'rouge', 'decouvrir']);
  assert.deepEqual(
    OBJECTIVE_OPTIONS.map((o) => o.value),
    [...OBJECTIVES]
  );
  for (const o of OBJECTIVES) {
    const plan = DISCOVERY[o];
    assert.ok(plan.universe.slug && plan.universe.name, o);
    assert.ok(plan.nextLesson === null || plan.nextLesson.length > 0, o);
    assert.ok(plan.valLine.length > 0, o);
  }
  // Objectif inconnu : « je découvre »
  assert.equal(discoveryPlan(null), DISCOVERY.decouvrir);
});

test('prochaine leçon : celle du document, sinon la première de l’univers conseillé, sinon le premier module', () => {
  const mod = (id: number, title?: string) => ({ id, lessons: title ? [{ title }] : [] }) as unknown as Module;
  const universe = (slug: string, moduleIds: number[]): Universe => ({ id: 1, slug, name: slug, description: null, position: 0, moduleIds });
  const modules = [mod(1, 'Budget de base'), mod(2), mod(3, 'Le compte courant')];

  // Fixée par le document
  assert.equal(nextLessonTitle(DISCOVERY.epargner, [], []), 'Le mois où tout tombe en même temps');
  // Première leçon publiée de l'univers conseillé (le module 2 est vide)
  assert.equal(nextLessonTitle(DISCOVERY.comprendre, [universe('garder-la-main', [2, 3])], modules), 'Le compte courant');
  // Univers sans module publié : premier module disponible
  assert.equal(nextLessonTitle(DISCOVERY.comprendre, [universe('garder-la-main', [])], modules), 'Budget de base');
  // Rien de chargé (pas encore de compte)
  assert.equal(nextLessonTitle(DISCOVERY.comprendre, [], []), null);
});

test('chaque leçon passe la validation de normalize (aucun écran non géré, un titre)', () => {
  for (const o of OBJECTIVES) {
    const lesson = discoveryLesson(o);
    assert.ok(lesson.title, o);
    assert.ok(lesson.screens.length >= 3, o);
    assert.deepEqual(
      lesson.screens.filter((s) => s.kind === 'unsupported').map((s) => s.index),
      [],
      `${o} : écran non géré`
    );
    // Le pari vient en premier : le titre de la leçon est affiché avant lui
    assert.equal(lesson.screens[0].kind, 'slider', o);
  }
});

test('chaque question a exactement une bonne réponse', () => {
  for (const o of OBJECTIVES) {
    for (const s of discoveryLesson(o).screens) {
      if (s.kind === 'choice') assert.equal(s.options.filter((x) => x.correct).length, 1, `${o} #${s.index}`);
      if (s.kind === 'document' && s.mode === 'pick') assert.equal(s.lines.filter((l) => l.correct).length, 1, `${o} #${s.index}`);
    }
  }
});

test('révélations : rappel de l’estimation, et décomposition juste (+ ajoute, = vérifie le total)', () => {
  for (const o of OBJECTIVES) {
    const screens = discoveryLesson(o).screens;
    for (const s of screens) {
      if (s.kind !== 'reveal') continue;
      // Rappel de l'estimation : un curseur avant, dont la plage contient la vraie valeur
      assert.ok(s.fromScreen !== null && s.fromScreen < s.index, `${o} #${s.index}`);
      const slider = screens[s.fromScreen!];
      assert.equal(slider.kind, 'slider');
      if (slider.kind === 'slider') assert.ok(slider.min <= s.value && s.value <= slider.max, `${o} : valeur hors du curseur`);
      // Décomposition : on part de la première ligne, « + » ajoute, « = » doit tomber juste
      // (en centimes : 13,49 + 11,99 + … ne tombe pas juste en virgule flottante)
      const cents = (v: unknown) => Math.round(Number(v) * 100);
      let total = cents(s.lines[0].value);
      for (const line of s.lines.slice(1)) {
        const v = cents(line.value);
        if (line.label.startsWith('+')) total += v;
        else if (line.label.startsWith('-') || line.label.startsWith('−')) total -= v;
        else if (line.label.startsWith('=')) assert.equal(v, total, `${o} : « ${line.label} »`);
      }
      // La ligne clé vaut le grand chiffre (un total « par mois » une fois
      // multiplié par 12), ou bien en est une part et les lignes chiffrées
      // s'additionnent pour le donner (versé + intérêts)
      const key = s.lines.find((l) => l.key);
      const keyValue = /par mois/.test(key?.label ?? '') ? Math.round(Number(key?.value) * 12) : Number(key?.value);
      const sum = s.lines.filter((l) => l.value !== '').reduce((acc, l) => acc + cents(l.value), 0);
      assert.ok(keyValue === s.value || sum === cents(s.value), `${o} : la ligne clé vaut le grand chiffre`);
    }
  }
});

test('leçon « comprendre » : les chiffres du document (abonnements fantômes)', () => {
  const lesson = normalizeLesson(DISCOVERY.comprendre.lesson);
  const [pari, reveal] = lesson.screens;
  assert.equal(lesson.title, 'Les abonnements fantômes');
  assert.equal(pari.kind, 'slider');
  if (pari.kind === 'slider') assert.deepEqual([pari.min, pari.max, pari.start], [0, 2000, 300]);
  assert.equal(reveal.kind, 'reveal');
  if (reveal.kind === 'reveal') {
    assert.equal(reveal.value, 1012);
    assert.deepEqual(
      reveal.lines.map((l) => l.value),
      [13.49, 11.99, 34.9, 15.99, 7.99, 84.36]
    );
  }
});

// ---------------------------------------------------------------------------
// Parcours
// ---------------------------------------------------------------------------
test('état du parcours : relu du téléphone, illisible → départ', () => {
  assert.deepEqual(parseOnboarding(null), INITIAL_ONBOARDING);
  assert.deepEqual(parseOnboarding('n’importe quoi'), INITIAL_ONBOARDING);
  assert.deepEqual(parseOnboarding({ status: 'en-cours', step: 'fin', objective: 'investir', pseudo: 'alex' }), {
    status: 'en-cours',
    step: 'fin',
    objective: 'investir',
    pseudo: 'alex',
  });
  // Leçon sans objectif : retour au choix de l'objectif
  assert.equal(parseOnboarding({ step: 'lecon' }).step, 'objectif');
  assert.equal(parseOnboarding({ step: 'inconnu' }).step, 'bienvenue');
  assert.equal(parseOnboarding({ objective: 'devenir-riche' }).objective, null);
});

test('reprise : chaque étape a son écran', () => {
  assert.equal(routeForStep('bienvenue'), '/bienvenue');
  assert.equal(routeForStep('objectif'), '/bienvenue/objectif');
  assert.equal(routeForStep('lecon'), '/bienvenue/lecon');
  assert.equal(routeForStep('fin'), '/bienvenue/fin');
  assert.equal(routeForStep('pseudo'), '/bienvenue/inscription');
  assert.equal(routeForStep('compte'), '/bienvenue/inscription');
  assert.equal(routeForStep('rappel'), '/bienvenue/inscription');
});

test('une personne connectée ne voit jamais le parcours ; terminé ou remis à plus tard, plus jamais', () => {
  assert.equal(shouldShowOnboarding(INITIAL_ONBOARDING, false), true);
  assert.equal(shouldShowOnboarding(INITIAL_ONBOARDING, true), false);
  assert.equal(shouldShowOnboarding({ ...INITIAL_ONBOARDING, status: 'termine' }, false), false);
  assert.equal(shouldShowOnboarding({ ...INITIAL_ONBOARDING, status: 'plus-tard' }, false), false);
});

test('règles du serveur : pseudo 3 à 20 caractères [a-zA-Z0-9-_], mot de passe 8 caractères au moins', () => {
  assert.equal(pseudoError('al'), 'Au moins 3 caractères.');
  assert.equal(pseudoError('alex_42'), null);
  assert.ok(pseudoError('alex 42'));
  assert.ok(pseudoError('élodie'));
  assert.ok(pseudoError('a'.repeat(21)));
  assert.deepEqual(
    PASSWORD_RULES.map((r) => r.label),
    ['Au moins 8 caractères']
  );
  assert.equal(passwordValid('1234567'), false);
  assert.equal(passwordValid('12345678'), true);
  assert.equal(emailValid('alex@exemple.fr'), true);
  assert.equal(emailValid('alex@exemple'), false);
});

test('erreurs d’inscription claires, adresse déjà prise reconnue', () => {
  assert.deepEqual(signupError('Cette adresse a déjà un compte.'), { text: 'Cette adresse a déjà un compte.', emailTaken: true });
  assert.equal(signupError('The email has already been taken.').emailTaken, true);
  assert.match(signupError('Ce pseudo est déjà pris.').text, /pseudo est déjà pris/);
  assert.match(signupError('Network request failed').text, /connexion/);
  assert.match(signupError('Échec de l\'inscription').text, /n’a pas abouti/);
  assert.equal(signupError('Ton mot de passe doit faire au moins 8 caractères.').text, 'Ton mot de passe doit faire au moins 8 caractères.');
});

// ---------------------------------------------------------------------------
// Rappel
// ---------------------------------------------------------------------------
test('créneaux : matin 8 h, midi 12 h 30, soir 19 h', () => {
  assert.deepEqual(
    REMINDER_SLOTS.map((s) => `${s.label} ${formatTime(s.time)}`),
    ['Matin 8 h', 'Midi 12 h 30', 'Soir 19 h']
  );
  assert.deepEqual(clampTime(25, -5), { hour: 1, minute: 55 });
});

test('rappels : un par jour à l’heure choisie, à partir d’aujourd’hui si l’heure n’est pas passée', () => {
  const before = upcomingReminders(new Date(2026, 9, 10, 9, 0), { hour: 19, minute: 0 }, 3);
  assert.deepEqual(
    before.map((d) => [d.getDate(), d.getHours(), d.getMinutes()]),
    [
      [10, 19, 0],
      [11, 19, 0],
      [12, 19, 0],
    ]
  );
  const after = upcomingReminders(new Date(2026, 9, 10, 20, 0), { hour: 19, minute: 0 }, 2);
  assert.equal(after[0].getDate(), 11);
});

test('le texte du rappel parle comme Val et change d’un jour à l’autre', () => {
  const week = Array.from({ length: 7 }, (_, i) => reminderMessageFor(new Date(2026, 9, 10 + i)).body);
  assert.equal(new Set(week).size, REMINDER_MESSAGES.length);
  assert.deepEqual(reminderMessageFor(new Date(2026, 9, 10, 8)), reminderMessageFor(new Date(2026, 9, 10, 22)));
});
