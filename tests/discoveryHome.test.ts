/// <reference types="node" />
// Lancer : npm test
// Accueil d'Apprendre sans compte (utils/discoveryHome.ts)

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { OBJECTIVES } from '../src/lesson/discovery';
import {
  accountCard,
  allTopicsDone,
  flameTier,
  recordLessonDone,
  remainingLabel,
  remainingTopics,
  shouldIgnite,
  showAccountCard,
  topicDots,
  weekDays,
  daysLabel,
  discoveryStreak,
  discoveryTiles,
  discoveryXp,
  doneToday,
  endActions,
  guestSubtitle,
  guestTitle,
  homeCard,
  lessonHook,
  objectiveValLine,
  withLessonDay,
} from '../src/utils/discoveryHome';
import {
  INITIAL_ONBOARDING,
  isSignupClosed,
  needsLessonDayMigration,
  parseOnboarding,
  SIGNUP_CLOSED_MEMORY_MS,
  withPlayed,
} from '../src/utils/onboarding';

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
  assert.deepEqual(card.progress, { line: 'Encore 5 sujets à découvrir.', dots: [true, false, false, false, false, false] });
});

test('carte : leçon terminée, inscription ouverte → CRÉER MON COMPTE, « Un autre sujet » dessous', () => {
  const card = homeCard({ objective: 'investir', started: [], played: ['investir'], signupClosed: false });
  assert.deepEqual([card.action, card.actionLabel, card.secondary], [
    'creer-compte',
    'CRÉER MON COMPTE',
    { action: 'autre-sujet', label: 'Un autre sujet' },
  ]);
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
});

test('prénom absent : aucune virgule ni espace orphelin', () => {
  const evening = new Date(2026, 9, 10, 21, 0);
  assert.equal(guestTitle('', evening), 'Bonsoir');
  assert.equal(guestTitle('   ', new Date(2026, 9, 10, 9, 0)), 'Bonjour');
  assert.equal(objectiveValLine(''), 'Enchanté ! Qu’est-ce qui t’amène ?');
});

test('sous-titre de l’accueil : six sujets, leçon du jour faite, sinon l’invitation', () => {
  assert.equal(guestSubtitle({ allDone: false, doneToday: true }), 'Reviens demain pour garder ta série.');
  assert.equal(guestSubtitle({ allDone: false, doneToday: false }), 'Une minute pour comprendre l’argent.');
  assert.equal(guestSubtitle({ allDone: true, doneToday: true }), 'Tu as découvert les six sujets.');
  assert.equal(guestSubtitle({ allDone: true, doneToday: false }), 'Tu as découvert les six sujets.');
  // Leçon de la carte terminée aujourd'hui : le jour compte, « Reviens demain »
  const now = new Date(2026, 9, 10, 21, 0);
  const done = recordLessonDone(INITIAL_ONBOARDING, 'epargner', now);
  assert.equal(guestSubtitle({ allDone: allTopicsDone(done.patch.played), doneToday: doneToday(done.patch.lessonDays, now) }), 'Reviens demain pour garder ta série.');
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

// ---------------------------------------------------------------------------
// Série : jour compté, leçons sans date
// ---------------------------------------------------------------------------
test('série : terminer une leçon aujourd’hui compte toujours le jour', () => {
  const now = new Date(2026, 9, 10, 21, 0);
  const first = recordLessonDone(INITIAL_ONBOARDING, 'epargner', now);
  assert.deepEqual([first.streakFrom, first.streakTo], [0, 1]);
  assert.equal(discoveryStreak(first.patch.lessonDays, now), 1);
  // Plusieurs leçons le même jour : toujours 1 jour, rien n'est perdu
  const second = recordLessonDone({ ...INITIAL_ONBOARDING, ...first.patch }, 'crypto', now);
  assert.deepEqual([second.streakFrom, second.streakTo], [1, 1]);
  assert.deepEqual(second.patch.played, ['epargner', 'crypto']);
  // Rejouée (sans objectif connu) : le jour compte quand même
  assert.equal(recordLessonDone(INITIAL_ONBOARDING, null, now).streakTo, 1);
  // Le lendemain : 2 jours ; un jour sans leçon ensuite : la série casse
  const tomorrow = new Date(2026, 9, 11, 8, 0);
  const next = recordLessonDone({ ...INITIAL_ONBOARDING, ...second.patch }, 'impots', tomorrow);
  assert.deepEqual([next.streakFrom, next.streakTo], [1, 2]);
  assert.equal(discoveryStreak(next.patch.lessonDays, new Date(2026, 9, 12, 23, 0)), 2);
  assert.equal(discoveryStreak(next.patch.lessonDays, new Date(2026, 9, 13, 8, 0)), 0);
});

test('série : leçons jouées avant la série (sans date) comptées pour le jour de la relecture', () => {
  const now = new Date(2026, 9, 10, 21, 0);
  // Mémoire de la version de 18 h 27 : des leçons jouées, pas de jours
  const legacy = { status: 'plus-tard', objective: 'epargner', played: ['epargner', 'crypto'] };
  assert.equal(needsLessonDayMigration(legacy), true);
  const state = parseOnboarding(legacy, now);
  assert.deepEqual(state.lessonDays, ['2026-10-10']);
  assert.equal(discoveryStreak(state.lessonDays, now), 1);
  // Rien de joué, ou jours déjà là : rien n'est inventé
  assert.equal(needsLessonDayMigration({ played: [] }), false);
  assert.deepEqual(parseOnboarding({ played: [] }, now).lessonDays, []);
  assert.equal(needsLessonDayMigration({ played: ['crypto'], lessonDays: [] }), false);
  assert.deepEqual(parseOnboarding({ played: ['crypto'], lessonDays: [] }, now).lessonDays, []);
});

test('semaine en cours : lundi à dimanche, jours faits, manqués, aujourd’hui, à venir', () => {
  // Samedi 10 octobre 2026
  const now = new Date(2026, 9, 10, 21, 0);
  const week = weekDays(['2026-10-05', '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-01'], now);
  assert.deepEqual(
    week.map((d) => d.letter),
    ['L', 'M', 'M', 'J', 'V', 'S', 'D']
  );
  assert.deepEqual(
    week.map((d) => d.state),
    ['done', 'missed', 'missed', 'done', 'done', 'done', 'quiet']
  );
  assert.deepEqual(
    week.map((d) => d.isToday),
    [false, false, false, false, false, true, false]
  );
  // Aujourd'hui sans leçon
  assert.equal(weekDays([], now)[5].state, 'today');
  // Dimanche : la semaine commence bien au lundi précédent
  const sunday = weekDays(['2026-10-05'], new Date(2026, 9, 11, 9, 0));
  assert.equal(sunday[0].state, 'done');
  assert.equal(sunday[6].isToday, true);
});

// ---------------------------------------------------------------------------
// Flamme
// ---------------------------------------------------------------------------
test('flamme : paliers selon le nombre de jours', () => {
  assert.deepEqual([flameTier(0).level, flameTier(0).glow, flameTier(0).sparkEvery], [0, false, null]);
  assert.equal(flameTier(1).level, 1);
  assert.equal(flameTier(2).level, 1);
  assert.equal(flameTier(2).glow, false);
  assert.deepEqual([flameTier(3).level, flameTier(3).glow, flameTier(3).sparkEvery], [2, true, null]);
  assert.equal(flameTier(6).level, 2);
  assert.ok(flameTier(3).scale > flameTier(2).scale);
  assert.equal(flameTier(7).level, 3);
  assert.equal(flameTier(29).level, 3);
  assert.ok(flameTier(7).sparkEvery !== null);
  assert.equal(flameTier(7).halo, false);
  assert.deepEqual([flameTier(30).level, flameTier(30).halo], [4, true]);
  // Plus d'étincelles à 30 jours
  assert.ok(flameTier(365).sparkEvery! < flameTier(7).sparkEvery!);
});

test('flamme : allumage une fois par jour', () => {
  const now = new Date(2026, 9, 10, 9, 0);
  assert.equal(shouldIgnite(null, now), true);
  assert.equal(shouldIgnite('2026-10-09', now), true);
  assert.equal(shouldIgnite('2026-10-10', now), false);
});

// ---------------------------------------------------------------------------
// Avancée dans les six leçons
// ---------------------------------------------------------------------------
test('sujets restants : nombre réel et accord', () => {
  assert.equal(remainingTopics([]), 6);
  assert.equal(remainingTopics(['crypto', 'crypto' as never]), 5);
  assert.equal(remainingLabel(5), 'Encore 5 sujets à découvrir.');
  assert.equal(remainingLabel(1), 'Encore 1 sujet à découvrir.');
  assert.deepEqual(topicDots(['impots', 'epargner']), [true, false, false, false, true, false]);
  const card = homeCard({ objective: 'crypto', started: [], played: ['crypto', 'epargner', 'investir', 'logement', 'impots'], signupClosed: true });
  assert.equal(card.progress?.line, 'Encore 1 sujet à découvrir.');
});

test('carte six sur six : « Tu as fait le tour ! », texte et bouton selon l’inscription', () => {
  const all = [...OBJECTIVES];
  const closed = homeCard({ objective: 'crypto', started: all, played: all, signupClosed: true });
  assert.equal(closed.state, 'six');
  assert.equal(closed.badge, '6 SUR 6');
  assert.equal(closed.title, 'Tu as fait le tour !');
  assert.equal(
    closed.text,
    'Six sujets, six déclics. La suite, ce sont les vrais modules : ils t’attendent dès l’ouverture des inscriptions.'
  );
  assert.deepEqual([closed.action, closed.actionLabel, closed.secondary, closed.progress], ['rejouer', 'REJOUER UNE LEÇON', null, null]);
  const open = homeCard({ objective: null, started: [], played: all, signupClosed: false });
  assert.equal(open.state, 'six');
  assert.equal(open.text, 'Six sujets, six déclics. Crée ton compte pour débloquer les vrais modules.');
  assert.deepEqual([open.action, open.actionLabel], ['creer-compte', 'CRÉER MON COMPTE']);
  assert.deepEqual(open.secondary, { action: 'autre-sujet', label: 'Rejouer une leçon' });
});

test('carte du compte : jamais deux « Créer mon compte »', () => {
  const done = (signupClosed: boolean) => homeCard({ objective: 'epargner', started: [], played: ['epargner'], signupClosed });
  // Ouverte, leçon terminée : la grande carte crée le compte, la petite disparaît
  assert.equal(done(false).action, 'creer-compte');
  assert.equal(showAccountCard(done(false), false), false);
  // Fermée : « UN AUTRE SUJET » sur la carte, la petite carte « Se connecter »
  assert.equal(done(true).action, 'autre-sujet');
  assert.equal(showAccountCard(done(true), true), true);
  assert.equal(accountCard(true).actionLabel, 'Se connecter');
  // Ouverte, leçon pas encore faite : un seul « Créer mon compte », en bas
  const fresh = homeCard({ objective: 'epargner', started: [], played: [], signupClosed: false });
  assert.equal(showAccountCard(fresh, false), true);
  // Six sur six, ouverte : la grande carte porte l'inscription
  const six = homeCard({ objective: 'epargner', started: [], played: [...OBJECTIVES], signupClosed: false });
  assert.equal(showAccountCard(six, false), false);
});

test('célébration des six leçons : à la sixième, quel que soit l’ordre, une seule fois', () => {
  const now = new Date(2026, 9, 10, 21, 0);
  const five = { ...INITIAL_ONBOARDING, played: ['impots', 'crypto', 'decouvrir', 'logement', 'investir'] as const };
  const sixth = recordLessonDone({ ...five, played: [...five.played] }, 'epargner', now);
  assert.equal(sixth.celebrateSix, true);
  assert.equal(sixth.patch.sixCelebrated, true);
  // Rejouer une leçon ensuite : plus de célébration
  const replay = recordLessonDone({ ...INITIAL_ONBOARDING, ...sixth.patch }, 'crypto', now);
  assert.equal(replay.celebrateSix, false);
  assert.equal(replay.patch.sixCelebrated, true);
  // Pas encore six : rien
  assert.equal(recordLessonDone(INITIAL_ONBOARDING, 'crypto', now).celebrateSix, false);
  // Six déjà faites avant cette version (jamais célébrées) : rejouer ne célèbre pas
  const legacy = recordLessonDone({ ...INITIAL_ONBOARDING, played: [...OBJECTIVES] }, 'crypto', now);
  assert.equal(legacy.celebrateSix, false);
  // Mémorisée sur le téléphone
  assert.equal(parseOnboarding({ sixCelebrated: true }).sixCelebrated, true);
  assert.equal(parseOnboarding({ sixCelebrated: 'oui' }).sixCelebrated, false);
});
