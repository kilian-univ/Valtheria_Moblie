/// <reference types="node" />
// Lancer : npm test
// Accueil d'Apprendre sans compte (utils/discoveryHome.ts)

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { OBJECTIVES } from '../src/lesson/discovery';
import {
  accountCard,
  daysLabel,
  discoveryStreak,
  discoveryTiles,
  discoveryXp,
  doneToday,
  endActions,
  endTitle,
  guestSubtitle,
  guestTitle,
  homeCard,
  lessonHook,
  objectiveValLine,
  withLessonDay,
} from '../src/utils/discoveryHome';
import { isSignupClosed, parseOnboarding, SIGNUP_CLOSED_MEMORY_MS, withPlayed } from '../src/utils/onboarding';

// ---------------------------------------------------------------------------
// Grande carte
// ---------------------------------------------------------------------------
test('carte : leçon jamais commencée → « POUR TOI, 1 MIN », accroche, COMMENCER', () => {
  const card = homeCard({ objective: 'epargner', started: [], played: [], signupClosed: true });
  assert.equal(card.state, 'jamais');
  assert.equal(card.badge, 'POUR TOI, 1 MIN');
  assert.equal(card.title, 'L’argent qui fond');
  assert.equal(card.text, 'Pourquoi l’argent qui dort perd de la valeur');
  assert.deepEqual([card.action, card.actionLabel], ['commencer', 'COMMENCER']);
});

test('carte : leçon commencée mais pas finie → REPRENDRE', () => {
  const card = homeCard({ objective: 'crypto', started: ['crypto'], played: [], signupClosed: true });
  assert.equal(card.state, 'commencee');
  assert.equal(card.badge, 'POUR TOI, 1 MIN');
  assert.equal(card.text, 'Ce que la crypto peut faire en un an');
  assert.deepEqual([card.action, card.actionLabel], ['reprendre', 'REPRENDRE']);
  // Une autre leçon jouée ne compte pas pour celle de l'objectif
  assert.equal(homeCard({ objective: 'crypto', started: ['crypto', 'impots'], played: ['impots'], signupClosed: true }).state, 'commencee');
});

test('carte : leçon terminée, inscription fermée → « LEÇON TERMINÉE », l’univers, UN AUTRE SUJET', () => {
  const card = homeCard({ objective: 'epargner', started: ['epargner'], played: ['epargner'], signupClosed: true });
  assert.equal(card.state, 'terminee');
  assert.equal(card.badge, 'LEÇON TERMINÉE');
  assert.equal(card.text, 'La suite t’attend dans l’univers Avant d’investir.');
  assert.deepEqual([card.action, card.actionLabel, card.secondary], ['autre-sujet', 'UN AUTRE SUJET', null]);
});

test('carte : leçon terminée, inscription ouverte → CRÉER MON COMPTE, « Un autre sujet » dessous', () => {
  const card = homeCard({ objective: 'investir', started: [], played: ['investir'], signupClosed: false });
  assert.deepEqual([card.action, card.actionLabel, card.secondary], ['creer-compte', 'CRÉER MON COMPTE', 'autre-sujet']);
  // Nom de l'univers du serveur s'il est chargé
  const loaded = homeCard({
    objective: 'investir',
    started: [],
    played: ['investir'],
    signupClosed: false,
    universes: [{ id: 1, slug: 'bourse', name: 'La Bourse', moduleIds: [], position: 0 } as never],
  });
  assert.equal(loaded.text, 'La suite t’attend dans l’univers La Bourse.');
  // Pas terminée : bouton de la carte identique, inscription ouverte ou non
  assert.equal(homeCard({ objective: 'investir', started: [], played: [], signupClosed: false }).action, 'commencer');
});

test('carte : sans objectif, la leçon « Je découvre »', () => {
  const card = homeCard({ objective: null, started: [], played: [], signupClosed: true });
  assert.equal(card.objective, 'decouvrir');
  assert.equal(card.title, 'Ton vrai salaire');
});

test('phrases d’accroche des six leçons', () => {
  assert.deepEqual(
    OBJECTIVES.map(lessonHook),
    [
      'Pourquoi l’argent qui dort perd de la valeur',
      'Ce que le temps fait à 100 € par mois',
      'Ce que la crypto peut faire en un an',
      'Ce que coûte vraiment un emprunt',
      'Pourquoi une prime ne fait jamais perdre d’argent',
      'Ce que tu coûtes à ton employeur',
    ]
  );
});

// ---------------------------------------------------------------------------
// Feuille « Un autre sujet »
// ---------------------------------------------------------------------------
test('feuille : les six leçons dans l’ordre du document, jouées cochées', () => {
  const tiles = discoveryTiles('crypto', ['impots', 'epargner']);
  assert.deepEqual(
    tiles.map((t) => t.objective),
    [...OBJECTIVES]
  );
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
  const crypto = tiles.find((t) => t.objective === 'crypto');
  assert.deepEqual([crypto?.title, crypto?.subject, crypto?.icon, crypto?.universeSlug], ['Le grand huit', 'Crypto', 'logo-bitcoin', 'crypto']);
  // Ajoutée une seule fois
  assert.deepEqual(withPlayed(['crypto'], 'crypto'), ['crypto']);
  assert.deepEqual(withPlayed(['crypto'], 'impots'), ['crypto', 'impots']);
});

// ---------------------------------------------------------------------------
// Série et XP du téléphone
// ---------------------------------------------------------------------------
test('série : jours d’affilée, tenue jusqu’à minuit le lendemain', () => {
  const now = new Date(2026, 9, 10, 21, 0);
  assert.equal(discoveryStreak([], now), 0);
  assert.equal(discoveryStreak(['2026-10-10'], now), 1);
  assert.equal(discoveryStreak(['2026-10-08', '2026-10-09', '2026-10-10'], now), 3);
  // Leçon du jour pas encore faite : la série d'hier tient
  assert.equal(discoveryStreak(['2026-10-08', '2026-10-09'], now), 2);
  // Un jour manqué : la série repart
  assert.equal(discoveryStreak(['2026-10-07', '2026-10-08'], now), 0);
  assert.equal(discoveryStreak(['2026-10-07', '2026-10-09', '2026-10-10'], now), 2);
  // Changement de mois
  assert.equal(discoveryStreak(['2026-09-30', '2026-10-01'], new Date(2026, 9, 1, 8)), 2);
  assert.deepEqual(daysLabel(0), '0 jour');
  assert.deepEqual(daysLabel(1), '1 jour');
  assert.deepEqual(daysLabel(4), '4 jours');
});

test('série : le jour de la leçon est ajouté une fois, relu du téléphone', () => {
  const day = new Date(2026, 9, 10, 9, 0);
  assert.deepEqual(withLessonDay([], day), ['2026-10-10']);
  assert.deepEqual(withLessonDay(['2026-10-10'], day), ['2026-10-10']);
  assert.deepEqual(withLessonDay(['2026-10-09'], day), ['2026-10-09', '2026-10-10']);
  assert.equal(doneToday(['2026-10-10'], day), true);
  assert.equal(doneToday(['2026-10-09'], day), false);
  assert.deepEqual(parseOnboarding({ lessonDays: ['2026-10-10', 'hier', 3, '2026-10-09', '2026-10-10'] }).lessonDays, ['2026-10-09', '2026-10-10']);
});

test('XP : 20 par leçon découverte terminée', () => {
  assert.equal(discoveryXp([]), 0);
  assert.equal(discoveryXp(['epargner']), 20);
  assert.equal(discoveryXp(['epargner', 'crypto']), 40);
});

// ---------------------------------------------------------------------------
// Prénom
// ---------------------------------------------------------------------------
test('prénom présent : accueil, objectif et fin de leçon le citent', () => {
  const evening = new Date(2026, 9, 10, 21, 0);
  const morning = new Date(2026, 9, 10, 9, 0);
  assert.equal(guestTitle('Quentin', evening), 'Bonsoir, Quentin');
  assert.equal(guestTitle('Quentin', morning), 'Bonjour, Quentin');
  assert.equal(guestTitle('Quentin', new Date(2026, 9, 10, 17, 59)), 'Bonjour, Quentin');
  assert.equal(guestTitle('Quentin', new Date(2026, 9, 10, 18, 0)), 'Bonsoir, Quentin');
  assert.equal(objectiveValLine('Quentin'), 'Enchanté, Quentin ! Qu’est-ce qui t’amène ?');
  assert.equal(endTitle('Quentin', true), 'Bravo, Quentin !');
  assert.equal(endTitle('Quentin', false), 'Bravo, Quentin !');
});

test('prénom absent : aucune virgule ni espace orphelin', () => {
  const evening = new Date(2026, 9, 10, 21, 0);
  assert.equal(guestTitle('', evening), 'Bonsoir');
  assert.equal(guestTitle('   ', new Date(2026, 9, 10, 9, 0)), 'Bonjour');
  assert.equal(objectiveValLine(''), 'Enchanté ! Qu’est-ce qui t’amène ?');
  assert.equal(endTitle('', true), 'Première leçon terminée !');
  assert.equal(endTitle('', false), 'Leçon terminée !');
});

test('sous-titre de l’accueil selon la leçon du jour', () => {
  assert.equal(guestSubtitle(true), 'Reviens demain pour garder ta série.');
  assert.equal(guestSubtitle(false), 'Une minute pour comprendre l’argent.');
});

// ---------------------------------------------------------------------------
// Inscription ouverte ou fermée
// ---------------------------------------------------------------------------
test('carte du compte : inscription ouverte ou fermée', () => {
  assert.deepEqual(accountCard(false), {
    kind: 'open',
    title: 'Garde ta progression',
    text: 'Crée ton compte pour garder tes leçons et ta série.',
    action: 'register',
    actionLabel: 'Créer mon compte',
  });
  assert.deepEqual(accountCard(true), {
    kind: 'closed',
    title: 'Les inscriptions ouvrent très bientôt',
    text: 'En attendant, toutes les leçons sont à toi.',
    action: 'login',
    actionLabel: 'Se connecter',
  });
});

test('fin de leçon sans compte : créer le compte, ou « Me rappeler demain » si l’inscription est fermée', () => {
  assert.deepEqual(endActions(false, false), { kind: 'register' });
  assert.deepEqual(endActions(false, true), { kind: 'register' });
  assert.deepEqual(endActions(true, false), { kind: 'reminder' });
  // Rappel déjà actif : retour à l'accueil seulement
  assert.deepEqual(endActions(true, true), { kind: 'home' });
});

test('inscription fermée : retenue 3 jours après la dernière réponse « inscription_fermee »', () => {
  const now = 10 * SIGNUP_CLOSED_MEMORY_MS;
  assert.equal(isSignupClosed(null, now), false);
  assert.equal(isSignupClosed(now, now), true);
  assert.equal(isSignupClosed(now - SIGNUP_CLOSED_MEMORY_MS + 1, now), true);
  assert.equal(isSignupClosed(now - SIGNUP_CLOSED_MEMORY_MS, now), false);
  // Horloge du téléphone remise en arrière : pas de fermeture fantôme
  assert.equal(isSignupClosed(now + 1000, now), false);
  assert.equal(accountCard(isSignupClosed(now - 1000, now)).kind, 'closed');
  assert.equal(accountCard(isSignupClosed(null, now)).kind, 'open');
});

test('mémoire : leçons commencées, jouées et inscription fermée relues du téléphone', () => {
  const state = parseOnboarding({
    status: 'plus-tard',
    started: ['crypto', 'rouge'],
    played: ['crypto', 'projet', 'crypto', 'inconnu', 3],
    signupClosedAt: 1000,
  });
  // Ancien objectif traduit, doublons et inconnus écartés
  assert.deepEqual(state.started, ['crypto', 'epargner']);
  assert.deepEqual(state.played, ['crypto', 'logement']);
  assert.equal(state.signupClosedAt, 1000);
  assert.deepEqual(parseOnboarding({ played: 'crypto', signupClosedAt: 'hier' }).played, []);
  assert.equal(parseOnboarding({ signupClosedAt: 'hier' }).signupClosedAt, null);
  assert.deepEqual(parseOnboarding(null).played, []);
});
