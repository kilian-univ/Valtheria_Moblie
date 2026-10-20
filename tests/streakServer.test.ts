/// <reference types="node" />
// Lancer : npm test
// Fin de leçon idempotente (identifiant de partie) et série d'un compte
// connecté : gels, record et gel utilisé hier lus depuis le serveur, reprise
// des valeurs du téléphone à la première connexion.

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ATTEMPT_ID_PATTERN, newAttemptId } from '../src/utils/lessonAttempt';
import { simulateStreak } from '../src/utils/streakRewards';
import { bestStreakOf, streakFieldsOf, streakReprisePayload } from '../src/utils/streakServer';

// Ce que le serveur accepte (LessonController::complete)
const SERVER_PATTERN = /^[A-Za-z0-9._-]{1,64}$/;

test('identifiant de partie : forme attendue, accepté par le serveur, différent à chaque partie', () => {
  const id = newAttemptId();
  assert.match(id, ATTEMPT_ID_PATTERN);
  assert.match(id, SERVER_PATTERN);
  assert.ok(id.length <= 64);
  const ids = new Set(Array.from({ length: 200 }, () => newAttemptId()));
  assert.equal(ids.size, 200);
  // Déterministe pour un instant et un tirage donnés ; bornes gérées
  assert.equal(newAttemptId(1_792_440_000_000, 0.5), newAttemptId(1_792_440_000_000, 0.5));
  assert.match(newAttemptId(0, 0), SERVER_PATTERN);
  assert.match(newAttemptId(Date.now(), 0.999999999), ATTEMPT_ID_PATTERN);
});

test('champs de série du serveur : présents, bornés ; absents ou invalides : ignorés', () => {
  assert.deepEqual(streakFieldsOf({ streak_freezes: 1, streak_best: 12, streak_frozen_yesterday: true }), { streakFreezes: 1, streakBest: 12, streakFrozenYesterday: true });
  // Serveur plus ancien : rien
  assert.deepEqual(streakFieldsOf({ xp: 10, streak: 3 }), {});
  assert.deepEqual(streakFieldsOf(null), {});
  assert.deepEqual(streakFieldsOf('x'), {});
  // Valeurs impossibles ramenées dans les bornes
  assert.deepEqual(streakFieldsOf({ streak_freezes: 7, streak_best: -3 }), { streakFreezes: 2, streakBest: 0 });
  assert.deepEqual(streakFieldsOf({ streak_freezes: '2', streak_frozen_yesterday: 'oui' }), {});
});

test('meilleure série affichée : le plus grand de la série, du téléphone et du serveur', () => {
  assert.equal(bestStreakOf(3, 5, null), 5);
  assert.equal(bestStreakOf(9, 5, 7), 9);
  assert.equal(bestStreakOf(0, null, undefined), 0);
  assert.equal(bestStreakOf(2, 0, 11), 11);
});

test('reprise vers le serveur : record du téléphone et gels de la série locale, bornés', () => {
  // 14 jours d'affilée finissant hier : série 14, record 14, 2 gels gagnés
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(2026, 9, 19);
    d.setDate(d.getDate() - 13 + i);
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  });
  const history = simulateStreak(days, new Date(2026, 9, 20, 10));
  assert.equal(history.freezes, 2);
  assert.deepEqual(streakReprisePayload(0, history), { best: 14, freezes: 2 });
  // Le record du téléphone l'emporte s'il est plus grand
  assert.deepEqual(streakReprisePayload(30, history), { best: 30, freezes: 2 });
  // Sans leçon : rien à reprendre
  assert.deepEqual(streakReprisePayload(0, simulateStreak([], new Date(2026, 9, 20))), { best: 0, freezes: 0 });
});
