/// <reference types="node" />
// Lancer : npm test
// Accueil d'Apprendre sans compte (utils/discoveryHome.ts)

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { OBJECTIVES } from '../src/lesson/discovery';
import { accountCard, discoveryTiles, guestTitle } from '../src/utils/discoveryHome';
import { isSignupClosed, parseOnboarding, SIGNUP_CLOSED_MEMORY_MS, withPlayed } from '../src/utils/onboarding';

test('tuiles : les six leçons, l’objectif choisi en premier avec « Pour toi »', () => {
  const tiles = discoveryTiles('crypto', []);
  assert.deepEqual(
    tiles.map((t) => t.objective),
    ['crypto', 'epargner', 'investir', 'logement', 'impots', 'decouvrir']
  );
  assert.deepEqual(
    tiles.map((t) => t.forYou),
    [true, false, false, false, false, false]
  );
  assert.equal(tiles[0].title, 'Le grand huit');
  assert.equal(tiles[0].subject, 'Crypto');
  assert.equal(tiles[0].icon, 'logo-bitcoin');
  assert.equal(tiles[0].universeSlug, 'crypto');
  const epargner = tiles.find((t) => t.objective === 'epargner');
  assert.deepEqual([epargner?.title, epargner?.subject], ['L’argent qui fond', 'Épargner']);
});

test('tuiles : sans objectif choisi, l’ordre du document, sans « Pour toi »', () => {
  const tiles = discoveryTiles(null, []);
  assert.deepEqual(
    tiles.map((t) => t.objective),
    [...OBJECTIVES]
  );
  assert.ok(tiles.every((t) => !t.forYou));
  // Dernier objectif choisi : en premier aussi
  assert.equal(discoveryTiles('decouvrir', [])[0].objective, 'decouvrir');
});

test('tuiles : une leçon déjà jouée garde sa place et passe en « Rejouer »', () => {
  const tiles = discoveryTiles('epargner', ['impots', 'epargner']);
  assert.deepEqual(
    tiles.map((t) => [t.objective, t.played]),
    [
      ['epargner', true],
      ['investir', false],
      ['crypto', false],
      ['logement', false],
      ['impots', true],
      ['decouvrir', false],
    ]
  );
  // Ajoutée une seule fois
  assert.deepEqual(withPlayed(['crypto'], 'crypto'), ['crypto']);
  assert.deepEqual(withPlayed(['crypto'], 'impots'), ['crypto', 'impots']);
});

test('mémoire : leçons jouées et inscription fermée relues du téléphone', () => {
  const state = parseOnboarding({ status: 'plus-tard', played: ['crypto', 'projet', 'crypto', 'inconnu', 3], signupClosedAt: 1000 });
  // Ancien objectif traduit, doublons et inconnus écartés
  assert.deepEqual(state.played, ['crypto', 'logement']);
  assert.equal(state.signupClosedAt, 1000);
  assert.deepEqual(parseOnboarding({ played: 'crypto', signupClosedAt: 'hier' }).played, []);
  assert.equal(parseOnboarding({ signupClosedAt: 'hier' }).signupClosedAt, null);
  assert.deepEqual(parseOnboarding(null).played, []);
});

test('carte du compte : inscription ouverte ou fermée', () => {
  assert.deepEqual(accountCard(false), {
    kind: 'open',
    title: 'Garde ta progression',
    text: 'Crée ton compte pour garder tes leçons et ta série.',
    primary: 'register',
    secondary: 'login',
  });
  assert.deepEqual(accountCard(true), {
    kind: 'closed',
    title: 'Les inscriptions ouvrent très bientôt',
    text: 'En attendant, joue toutes les leçons découvertes.',
    primary: 'login',
    secondary: null,
  });
});

test('inscription fermée : retenue 3 jours après la dernière réponse « inscription_fermee »', () => {
  const now = 10 * SIGNUP_CLOSED_MEMORY_MS;
  assert.equal(isSignupClosed(null, now), false);
  assert.equal(isSignupClosed(now, now), true);
  assert.equal(isSignupClosed(now - SIGNUP_CLOSED_MEMORY_MS + 1, now), true);
  assert.equal(isSignupClosed(now - SIGNUP_CLOSED_MEMORY_MS, now), false);
  // Horloge du téléphone remise en arrière : pas de fermeture fantôme
  assert.equal(isSignupClosed(now + 1000, now), false);
  // Choix de la carte selon la mémoire
  assert.equal(accountCard(isSignupClosed(now - 1000, now)).kind, 'closed');
  assert.equal(accountCard(isSignupClosed(null, now)).kind, 'open');
});

test('titre de l’accueil sans compte : « Bienvenue » le jour, « Bonsoir » le soir', () => {
  assert.equal(guestTitle(new Date(2026, 9, 10, 9, 0)), 'Bienvenue');
  assert.equal(guestTitle(new Date(2026, 9, 10, 17, 59)), 'Bienvenue');
  assert.equal(guestTitle(new Date(2026, 9, 10, 18, 0)), 'Bonsoir');
  assert.equal(guestTitle(new Date(2026, 9, 10, 2, 0)), 'Bonsoir');
});
