/// <reference types="node" />
// Lancer : npm test
// Erreurs d'inscription et de connexion (utils/authErrors.ts)

import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  isNetworkMessage,
  isRegistrationClosed,
  loginErrorText,
  parseAuthFailure,
  readableMessage,
  REGISTRATION_CLOSED,
} from '../src/utils/authErrors';
import { signupErrorFrom } from '../src/utils/onboarding';

const CLOSED_MESSAGE = 'L’inscription depuis l’application est fermée pour le moment.';

test('inscription fermée : reconnue dans error.code comme à la racine', () => {
  const nested = parseAuthFailure(403, { error: { code: REGISTRATION_CLOSED, message: CLOSED_MESSAGE } });
  assert.deepEqual(nested, { status: 403, code: 'inscription_fermee', message: CLOSED_MESSAGE });
  assert.equal(isRegistrationClosed(nested), true);

  const root = parseAuthFailure(403, { code: REGISTRATION_CLOSED, message: CLOSED_MESSAGE });
  assert.equal(isRegistrationClosed(root), true);

  // Les deux à la fois (transition côté serveur)
  const both = parseAuthFailure(403, {
    code: REGISTRATION_CLOSED,
    message: CLOSED_MESSAGE,
    error: { code: REGISTRATION_CLOSED, message: CLOSED_MESSAGE },
  });
  assert.equal(isRegistrationClosed(both), true);

  // Enveloppé dans data
  assert.equal(isRegistrationClosed(parseAuthFailure(403, { data: { error: { code: REGISTRATION_CLOSED } } })), true);
  // Code reconnu même avec un autre statut
  assert.equal(isRegistrationClosed(parseAuthFailure(400, { code: REGISTRATION_CLOSED })), true);
  // 403 sans code (version du serveur sans code) : même décision
  assert.equal(isRegistrationClosed(parseAuthFailure(403, null)), true);
});

test('les autres erreurs ne passent jamais pour une inscription fermée', () => {
  assert.equal(isRegistrationClosed(null), false);
  assert.equal(isRegistrationClosed(parseAuthFailure(422, { message: 'Cette adresse a déjà un compte.' })), false);
  assert.equal(isRegistrationClosed(parseAuthFailure(403, { error: { code: 'compte_suspendu' } })), false);
  assert.equal(isRegistrationClosed(parseAuthFailure(500, {})), false);
  assert.equal(isRegistrationClosed(parseAuthFailure(429, 'Too Many Attempts.')), false);
});

test('message du serveur : à la racine d’abord, sinon dans error.message', () => {
  assert.equal(parseAuthFailure(422, { message: 'À la racine', error: { message: 'Dedans' } }).message, 'À la racine');
  assert.equal(parseAuthFailure(422, { error: { message: 'Dedans' } }).message, 'Dedans');
  assert.equal(parseAuthFailure(422, { message: '   ' }).message, null);
  assert.equal(parseAuthFailure(500, null).message, null);
});

test('message lisible : jamais un message technique, générique ou en anglais', () => {
  assert.equal(readableMessage('Ce pseudo est déjà pris.'), 'Ce pseudo est déjà pris.');
  assert.equal(readableMessage('La valeur ne peut pas être nulle.'), 'La valeur ne peut pas être nulle.');
  for (const m of [
    'Erreur API',
    'Échec de l\'inscription',
    'Identifiants incorrects',
    'Server Error',
    'Unauthenticated.',
    'These credentials do not match our records.',
    'SQLSTATE[23000]: Integrity constraint violation',
    'x'.repeat(250),
    '',
    null,
    undefined,
  ]) {
    assert.equal(readableMessage(m), null, String(m));
  }
  assert.equal(isNetworkMessage('Network request failed'), true);
  assert.equal(isNetworkMessage('Identifiants incorrects'), false);
});

test('inscription : message du serveur s’il est lisible, sinon le message générique', () => {
  const generic = 'L’inscription n’a pas abouti. Vérifie tes informations et réessaie.';
  // error.message lu en entier
  assert.equal(signupErrorFrom(parseAuthFailure(422, { error: { message: 'Ce pseudo est déjà pris.' } })).text, 'Ce pseudo est déjà pris. Reviens en arrière pour en choisir un autre.');
  assert.equal(signupErrorFrom(parseAuthFailure(422, { message: 'Le mot de passe est trop court.' })).text, 'Le mot de passe est trop court.');
  // Adresse déjà prise, même en anglais : proposée à la connexion
  const taken = signupErrorFrom(parseAuthFailure(422, { message: 'The email has already been taken.' }));
  assert.deepEqual(taken, { text: 'Cette adresse a déjà un compte.', emailTaken: true });
  // Anglais technique, générique d'ApiContext ou rien : message générique
  assert.equal(signupErrorFrom(parseAuthFailure(500, { message: 'Server Error' })).text, generic);
  assert.equal(signupErrorFrom(null, 'Échec de l\'inscription').text, generic);
  assert.equal(signupErrorFrom(parseAuthFailure(422, { message: 'The name field is required.' })).text, generic);
  assert.equal(signupErrorFrom(null, undefined).text, generic);
  // Sans réponse relue : le message d'ApiContext s'il est lisible
  assert.equal(signupErrorFrom(null, 'Ce pseudo est déjà pris.').text, 'Ce pseudo est déjà pris. Reviens en arrière pour en choisir un autre.');
});

test('connexion : message du serveur s’il est lisible, sinon « E-mail ou mot de passe incorrect. »', () => {
  assert.equal(loginErrorText(parseAuthFailure(401, { error: { message: 'Confirme d’abord ton adresse e-mail.' } })), 'Confirme d’abord ton adresse e-mail.');
  assert.equal(loginErrorText(parseAuthFailure(401, { message: 'Identifiants incorrects' })), 'E-mail ou mot de passe incorrect.');
  assert.equal(loginErrorText(parseAuthFailure(401, { message: 'These credentials do not match our records.' })), 'E-mail ou mot de passe incorrect.');
  assert.equal(loginErrorText(null), 'E-mail ou mot de passe incorrect.');
  assert.equal(loginErrorText(null, 'Network request failed'), 'Pas de connexion internet. Réessaie dans un instant.');
});
