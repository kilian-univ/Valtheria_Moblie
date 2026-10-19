/// <reference types="node" />
// Lancer : npm test
// Confirmation de l'adresse e-mail après l'inscription (19/10/2026) : bandeau
// tant que l'adresse n'est pas confirmée, demande de confirmation au bout de
// 7 jours, renvoi du courriel une fois par minute.

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { cooldownUntil, resendConfirmation, subscribeCooldown } from '../src/state/emailConfirmation';
import { cooldownLeft, emailConfirmationOf, resendLabel } from '../src/utils/emailConfirmation';

const NOW = Date.parse('2026-10-25T10:00:00Z');

test('adresse confirmée, sans compte ou serveur plus ancien : rien à demander', () => {
  assert.deepEqual(emailConfirmationOf({ email: 'a@b.fr', email_verified: true }, NOW), { pending: false, required: false, email: 'a@b.fr' });
  assert.equal(emailConfirmationOf(null, NOW).pending, false);
  // Champs absents (serveur d'avant la confirmation) : pas de bandeau
  assert.equal(emailConfirmationOf({ email: 'a@b.fr' }, NOW).pending, false);
});

test('adresse à confirmer : bandeau tout de suite, demande au bout de 7 jours', () => {
  const user = { email: 'a@b.fr', email_verified: false, email_confirm_before: '2026-11-01T10:00:00+00:00', email_confirmation_required: false };
  assert.deepEqual(emailConfirmationOf(user, NOW), { pending: true, required: false, email: 'a@b.fr' });
  // Le serveur dit que le délai est passé
  assert.equal(emailConfirmationOf({ ...user, email_confirmation_required: true }, NOW).required, true);
  // App restée ouverte au-delà de l'échéance
  assert.equal(emailConfirmationOf(user, Date.parse('2026-11-01T10:00:00Z')).required, true);
  assert.equal(emailConfirmationOf(user, Date.parse('2026-11-01T09:59:59Z')).required, false);
});

test('renvoi : compte à rebours en secondes, libellé du bouton', () => {
  assert.equal(cooldownLeft(NOW + 60_000, NOW), 60);
  assert.equal(cooldownLeft(NOW + 41_200, NOW), 42);
  assert.equal(cooldownLeft(NOW - 5, NOW), 0);
  assert.equal(resendLabel(0), 'Renvoyer le courriel');
  assert.equal(resendLabel(42), 'Renvoyer dans 42 s');
});

test('renvoi réussi : message du serveur, une minute d’attente partagée', async () => {
  let calls = 0;
  const unsub = subscribeCooldown(() => calls++);
  const before = Date.now();
  const r = await resendConfirmation(async (path) => {
    assert.equal(path, '/user/email/resend');
    return { sent: true, message: 'Courriel envoyé à a@b.fr.' };
  });
  unsub();
  assert.deepEqual(r, { ok: true, message: 'Courriel envoyé à a@b.fr.', alreadyConfirmed: false });
  assert.equal(calls, 1);
  assert.ok(cooldownUntil() >= before + 60_000 && cooldownUntil() <= Date.now() + 60_000);
});

test('renvoi : adresse déjà confirmée, refus du serveur, coupure réseau', async () => {
  const deja = await resendConfirmation(async () => ({ sent: false, message: 'Ton adresse est déjà confirmée.' }));
  assert.equal(deja.alreadyConfirmed, true);

  const trop = await resendConfirmation(async () => {
    throw new Error('Patiente encore un peu avant de renvoyer le courriel.');
  });
  assert.deepEqual(trop, { ok: false, message: 'Patiente encore un peu avant de renvoyer le courriel.', alreadyConfirmed: false });

  const hors = await resendConfirmation(async () => {
    throw new TypeError('Network request failed');
  });
  assert.equal(hors.ok, false);
  assert.equal(hors.message, 'Pas de connexion internet. Réessaie dans un instant.');
});
