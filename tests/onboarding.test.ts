/// <reference types="node" />
// Lancer : npm test

import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  emailValid,
  INITIAL_ONBOARDING,
  parseOnboarding,
  passwordValid,
  PASSWORD_RULES,
  pseudoError,
  routeForStep,
  sendDiscoveryCredit,
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
