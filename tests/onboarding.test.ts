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

test('enchaînement : bienvenue, prénom, objectif, leçon, fin, puis l’inscription', () => {
  assert.deepEqual(
    [...ONBOARDING_STEPS],
    ['bienvenue', 'prenom', 'objectif', 'lecon', 'fin', 'pseudo', 'compte', 'rappel']
  );
  assert.equal(stepAfter('bienvenue'), 'prenom');
  assert.equal(stepAfter('prenom'), 'objectif');
  assert.equal(stepAfter('objectif'), 'lecon');
  assert.equal(stepAfter('lecon'), 'fin');
  assert.equal(stepAfter('fin'), 'pseudo');
  assert.equal(stepAfter('rappel'), 'rappel');
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

test('inscription : prénom connu, pas d’étape du pseudo', () => {
  assert.deepEqual(signupSteps('Kantin'), ['compte', 'rappel']);
  assert.deepEqual(signupSteps('  Élise '), ['compte', 'rappel']);
  // Sans prénom, ou un prénom qui ne donne aucun pseudo : l'étape reste
  assert.deepEqual(signupSteps(''), ['pseudo', 'compte', 'rappel']);
  assert.deepEqual(signupSteps(null), ['pseudo', 'compte', 'rappel']);
  assert.deepEqual(signupSteps(undefined), ['pseudo', 'compte', 'rappel']);
  assert.deepEqual(signupSteps('!!!'), ['pseudo', 'compte', 'rappel']);
});

test('inscription : étape d’arrivée', () => {
  // Fin de la leçon découverte (step « pseudo ») avec un prénom : le compte
  assert.equal(signupStartStep('pseudo', 'Kantin'), 'compte');
  assert.equal(signupStartStep('pseudo', ''), 'pseudo');
  // « Créer mon compte » ailleurs (step quelconque)
  assert.equal(signupStartStep('termine', 'Kantin'), 'compte');
  assert.equal(signupStartStep(undefined, ''), 'pseudo');
  // Étape mémorisée reprise telle quelle
  assert.equal(signupStartStep('compte', ''), 'compte');
  assert.equal(signupStartStep('rappel', 'Kantin'), 'rappel');
});

test('inscription : le pseudo prérempli suit les règles du serveur', () => {
  const src = readFileSync(new URL('../src/screens/onboarding/SignupScreen.tsx', import.meta.url), 'utf8');
  // Barre de progression sur les étapes réelles
  assert.ok(src.includes('step={steps.indexOf(step) + 1}') && src.includes('total={steps.length}'));
  // Champ « Ton pseudo » dans l'étape du compte, création bloquée si invalide
  assert.ok(src.includes('{pseudoInAccount ? pseudoField : null}'));
  assert.ok(src.includes('(!pseudoInAccount || !pseudoProblem)'));
  assert.equal(pseudoError(pseudoFromFirstName('Kantin')), null);
});

test('lien direct vers la connexion ou l’inscription : on y reste pendant la première ouverture', () => {
  assert.equal(keepsDirectRoute('/client/login'), true);
  assert.equal(keepsDirectRoute('/client/register'), true);
  assert.equal(keepsDirectRoute('/bienvenue/prenom'), true);
  assert.equal(keepsDirectRoute('/apprendre'), false);
  assert.equal(keepsDirectRoute('/client/reglages'), false);
});
