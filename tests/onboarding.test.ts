/// <reference types="node" />
// Lancer : npm test

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import {
  cleanFirstName,
  emailValid,
  FIRST_NAME_MAX,
  INITIAL_ONBOARDING,
  ONBOARDING_STEPS,
  parseOnboarding,
  passwordValid,
  PASSWORD_RULES,
  pseudoError,
  pseudoFromFirstName,
  routeForStep,
  signupStartStep,
  signupSteps,
  sendDiscoveryCredit,
  shouldShowOnboarding,
  signupError,
  stepAfter,
  keepsDirectRoute,
} from '../src/utils/onboarding';
import {
  clampTime,
  formatTime,
  REMINDER_MESSAGES,
  REMINDER_SLOTS,
  reminderMessageFor,
  lessonDoneToday,
  plannedReminders,
  REMINDER_DAYS_AHEAD,
  upcomingReminders,
} from '../src/utils/reminder';

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
    firstName: '',
    pseudo: 'alex',
    started: [],
    played: [],
    lessonDays: [],
    sixCelebrated: false,
    bestStreak: 0,
    celebratedMedals: [],
    signupClosedAt: null,
  });
  // Leçon sans objectif : retour au choix de l'objectif
  assert.equal(parseOnboarding({ step: 'lecon' }).step, 'objectif');
  assert.equal(parseOnboarding({ step: 'inconnu' }).step, 'bienvenue');
  assert.equal(parseOnboarding({ objective: 'devenir-riche' }).objective, null);
});

test('état du parcours : un ancien objectif est traduit vers le plus proche', () => {
  assert.equal(parseOnboarding({ step: 'lecon', objective: 'comprendre' }).objective, 'epargner');
  assert.equal(parseOnboarding({ step: 'lecon', objective: 'rouge' }).objective, 'epargner');
  assert.equal(parseOnboarding({ step: 'fin', objective: 'projet' }).objective, 'logement');
  // Étape gardée : la leçon traduite reprend
  assert.equal(parseOnboarding({ step: 'lecon', objective: 'projet' }).step, 'lecon');
});

test('inscription : l’objectif ne part que si le serveur l’accepte, sinon la leçon est créditée sans', async () => {
  const calls: unknown[] = [];
  const accepts = async (_path: string, body: Record<string, unknown>) => {
    calls.push(body);
  };
  assert.equal(await sendDiscoveryCredit(accepts, 'crypto'), 'avec-objectif');
  assert.deepEqual([...calls], [{ objective: 'crypto' }]);

  calls.length = 0;
  const refusesObjective = async (_path: string, body: Record<string, unknown>) => {
    calls.push(body);
    if ('objective' in body) throw new Error('The selected objective is invalid.');
  };
  assert.equal(await sendDiscoveryCredit(refusesObjective, 'crypto'), 'sans-objectif');
  assert.deepEqual([...calls], [{ objective: 'crypto' }, {}]);

  // Route absente ou serveur en panne : aucune erreur ne remonte
  const down = async () => {
    throw new Error('Network request failed');
  };
  assert.equal(await sendDiscoveryCredit(down, 'crypto'), 'echec');
  assert.equal(await sendDiscoveryCredit(down, null), 'echec');
});

test('enchaînement : bienvenue, prénom, objectif, leçon, fin, puis l’inscription (compte, rappel)', () => {
  assert.deepEqual([...ONBOARDING_STEPS], ['bienvenue', 'prenom', 'objectif', 'lecon', 'fin', 'compte', 'rappel']);
  assert.equal(stepAfter('bienvenue'), 'prenom');
  assert.equal(stepAfter('prenom'), 'objectif');
  assert.equal(stepAfter('objectif'), 'lecon');
  assert.equal(stepAfter('lecon'), 'fin');
  assert.equal(stepAfter('fin'), 'compte');
  assert.equal(stepAfter('rappel'), 'rappel');
  // Parcours mémorisé à l'ancienne étape du pseudo : reprend au compte
  assert.equal(parseOnboarding({ step: 'pseudo', firstName: 'Léa' }).step, 'compte');
});

test('reprise : le prénom reprend sur son écran, le prénom donné est gardé', () => {
  assert.equal(routeForStep('prenom'), '/bienvenue/prenom');
  const state = parseOnboarding({ step: 'prenom', firstName: '  Quentin  ' });
  assert.equal(state.step, 'prenom');
  assert.equal(state.firstName, 'Quentin');
  // Prénom illisible : aucun
  assert.equal(parseOnboarding({ step: 'objectif', firstName: 42 }).firstName, '');
  // Objectif choisi, quitté pendant la leçon : la leçon reprend, prénom compris
  const lesson = parseOnboarding({ step: 'lecon', objective: 'crypto', firstName: 'Léa', started: ['crypto', 'x'] });
  assert.equal(routeForStep(lesson.step), '/bienvenue/lecon');
  assert.equal(lesson.firstName, 'Léa');
  assert.deepEqual(lesson.started, ['crypto']);
});

test('prénom : espaces retirés, 30 caractères au plus', () => {
  assert.equal(cleanFirstName('  Jean   Pierre '), 'Jean Pierre');
  assert.equal(cleanFirstName('   '), '');
  assert.equal(cleanFirstName('a'.repeat(40)).length, FIRST_NAME_MAX);
  assert.equal(FIRST_NAME_MAX, 30);
});

test('pseudo prérempli d’après le prénom, aux règles du serveur', () => {
  assert.equal(pseudoFromFirstName('Quentin'), 'Quentin');
  assert.equal(pseudoFromFirstName('Zoé'), 'Zoe');
  assert.equal(pseudoFromFirstName('Jean Pierre'), 'Jean-Pierre');
  assert.equal(pseudoFromFirstName('Anne-Sophie'), 'Anne-Sophie');
  assert.equal(pseudoFromFirstName('N’Golo'), 'NGolo');
  assert.equal(pseudoFromFirstName(''), '');
  assert.equal(pseudoError(pseudoFromFirstName('Maëlle Françoise')), null);
  assert.ok(pseudoFromFirstName('a'.repeat(30)).length <= 20);
});

test('reprise : chaque étape a son écran', () => {
  assert.equal(routeForStep('bienvenue'), '/bienvenue');
  assert.equal(routeForStep('objectif'), '/bienvenue/objectif');
  assert.equal(routeForStep('lecon'), '/bienvenue/lecon');
  assert.equal(routeForStep('fin'), '/bienvenue/fin');
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

test('leçon du jour faite : plus de rappel aujourd’hui, le premier est demain ; 30 jours d’avance', () => {
  const now = new Date(2026, 9, 10, 9, 0);
  assert.equal(lessonDoneToday('2026-10-10', now), true);
  assert.equal(lessonDoneToday('2026-10-09', now), false);
  assert.equal(lessonDoneToday(null, now), false);
  const skipped = upcomingReminders(now, { hour: 19, minute: 0 }, 2, true);
  assert.deepEqual(
    skipped.map((d) => [d.getDate(), d.getHours()]),
    [
      [11, 19],
      [12, 19],
    ]
  );
  // Par défaut : 30 jours (limite d'iOS : 64 notifications en attente, budget compris)
  assert.equal(REMINDER_DAYS_AHEAD, 30);
  assert.equal(upcomingReminders(now, { hour: 19, minute: 0 }).length, 30);
});

test('liste exacte programmée : leçon faite avant l’heure du rappel → rien aujourd’hui, le premier demain', () => {
  const time = { hour: 19, minute: 0 };
  const beforeHour = new Date(2026, 9, 10, 9, 0);
  // Sans leçon aujourd'hui : le rappel de ce soir est programmé, puis 29 jours
  const plain = plannedReminders(beforeHour, time, null);
  assert.equal(plain.length, 30);
  assert.deepEqual([plain[0].date.getDate(), plain[0].date.getHours(), plain[0].date.getMinutes()], [10, 19, 0]);
  assert.equal(plain[29].date.getDate(), new Date(2026, 9, 10 + 29).getDate());
  // Leçon faite ce matin : aucun rappel le 10, le premier le 11, toujours 30
  const done = plannedReminders(beforeHour, time, '2026-10-10');
  assert.equal(done.length, 30);
  assert.equal(done.some((r) => r.date.getDate() === 10 && r.date.getMonth() === 9), false);
  assert.deepEqual([done[0].date.getDate(), done[0].date.getHours()], [11, 19]);
  // Les jours se suivent sans trou, toujours à 19 h locales (le changement
  // d'heure du 25 octobre ne décale pas le rappel), et chaque rappel a un texte
  for (let i = 1; i < done.length; i++) {
    const previous = new Date(done[i - 1].date);
    previous.setDate(previous.getDate() + 1);
    assert.equal(done[i].date.toDateString(), previous.toDateString());
    assert.equal(done[i].date.getHours(), 19);
  }
  assert.ok(done.every((r) => r.title && r.body));
  // Une leçon faite un autre jour ne change rien
  assert.deepEqual(plannedReminders(beforeHour, time, '2026-10-09').map((r) => r.date.getTime()), plain.map((r) => r.date.getTime()));
});

test('liste exacte programmée : leçon faite après l’heure du rappel → identique, le premier est demain', () => {
  const time = { hour: 19, minute: 0 };
  const afterHour = new Date(2026, 9, 10, 20, 30);
  const done = plannedReminders(afterHour, time, '2026-10-10');
  const plain = plannedReminders(afterHour, time, null);
  assert.deepEqual(done.map((r) => r.date.getTime()), plain.map((r) => r.date.getTime()));
  assert.deepEqual([done[0].date.getDate(), done[0].date.getHours()], [11, 19]);
  assert.equal(done.length, 30);
  // Objectif connu : un jour sur deux, le texte de l'objectif
  const withObjective = plannedReminders(afterHour, time, null, 'epargner');
  assert.ok(withObjective.some((r) => r.body.includes('épargne')));
  assert.ok(withObjective.some((r) => !r.body.includes('épargne')));
});

test('le texte du rappel parle comme Val et change d’un jour à l’autre', () => {
  const week = Array.from({ length: 7 }, (_, i) => reminderMessageFor(new Date(2026, 9, 10 + i)).body);
  assert.equal(new Set(week).size, REMINDER_MESSAGES.length);
  assert.deepEqual(reminderMessageFor(new Date(2026, 9, 10, 8)), reminderMessageFor(new Date(2026, 9, 10, 22)));
});

test('inscription : deux étapes, le pseudo dans celle du compte, plus d’étape à lui', () => {
  assert.deepEqual(signupSteps(), ['compte', 'rappel']);
  // Étape d'arrivée : le rappel s'il était mémorisé, sinon le compte (quel que soit le prénom)
  assert.equal(signupStartStep('rappel'), 'rappel');
  assert.equal(signupStartStep('compte'), 'compte');
  assert.equal(signupStartStep('pseudo'), 'compte');
  assert.equal(signupStartStep('termine'), 'compte');
  assert.equal(signupStartStep(undefined), 'compte');
});

test('inscription : le pseudo proposé d’après le prénom, modifiable, aux règles du serveur', () => {
  const src = readFileSync(new URL('../src/screens/onboarding/SignupScreen.tsx', import.meta.url), 'utf8');
  // Barre de progression sur les étapes réelles
  assert.ok(src.includes('step={steps.indexOf(step) + 1}') && src.includes('total={steps.length}'));
  // Champ « Ton pseudo » toujours dans l'étape du compte, création bloquée si invalide
  assert.ok(src.includes('{pseudoField}'));
  assert.ok(src.includes('!submitting && !pseudoProblem'));
  // Val ne se présente plus qu'une fois, sur la bienvenue
  assert.ok(!src.includes('Moi, c’est Val'));
  const firstName = readFileSync(new URL('../src/screens/onboarding/FirstNameScreen.tsx', import.meta.url), 'utf8');
  assert.ok(!firstName.includes('Moi, c’est Val'));
  assert.equal(pseudoError(pseudoFromFirstName('Kantin')), null);
});

test('lien direct vers la connexion ou l’inscription : on y reste pendant la première ouverture', () => {
  assert.equal(keepsDirectRoute('/client/login'), true);
  assert.equal(keepsDirectRoute('/client/register'), true);
  assert.equal(keepsDirectRoute('/bienvenue/prenom'), true);
  assert.equal(keepsDirectRoute('/apprendre'), false);
  assert.equal(keepsDirectRoute('/client/reglages'), false);
});
