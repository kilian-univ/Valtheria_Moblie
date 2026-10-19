/// <reference types="node" />
// Lancer : npm test
// Suivi des plantages : actif seulement dans la version publiée avec une
// adresse d'envoi, et chaque rapport nettoyé de tout ce qui identifie la
// personne (e-mail, montants, jeton, nom de l'appareil, données libres).

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { monitoringEnabled, scrubEvent, scrubText } from '../src/utils/monitoring';

test('actif seulement hors développement et avec une adresse d’envoi', () => {
  assert.equal(monitoringEnabled(true, 'https://x@o1.ingest.de.sentry.io/1'), false);
  assert.equal(monitoringEnabled(false, undefined), false);
  assert.equal(monitoringEnabled(false, '  '), false);
  assert.equal(monitoringEnabled(false, 'https://x@o1.ingest.de.sentry.io/1'), true);
});

test('textes : e-mails, montants et jetons masqués, le reste intact', () => {
  assert.equal(scrubText('Compte camille@exemple.fr introuvable'), 'Compte [e-mail] introuvable');
  assert.equal(scrubText('Impossible d’enregistrer 1 234,56 € sur le livret'), 'Impossible d’enregistrer [montant] sur le livret');
  assert.equal(scrubText('Solde 12 euros, objectif 3 000 €'), 'Solde [montant], objectif [montant]');
  assert.equal(scrubText('Authorization: Bearer 12|AbCdEfGhIjKlMnOpQrStUvWxYz123456'), 'Authorization: Bearer [jeton]');
  assert.equal(scrubText('jeton 15|abcdefghijklmnopqrstuvwxyz0123'), 'jeton [jeton]');
  assert.equal(scrubText('Cannot read property "id" of undefined (écran 3, module 12)'), 'Cannot read property "id" of undefined (écran 3, module 12)');
});

test('rapport : sans personne, sans requête, sans données libres, sans nom d’appareil ; fil d’Ariane réduit aux écrans', () => {
  const event = {
    user: { id: 15, email: 'camille@exemple.fr' },
    request: { url: 'https://valtheria.fr/api/user', headers: { Authorization: 'Bearer 12|x' } },
    extra: { montant: 1200 },
    message: 'Erreur pour camille@exemple.fr : 1 200 € refusés',
    exception: { values: [{ type: 'Error', value: 'Solde 1 200 € introuvable pour camille@exemple.fr' }] },
    breadcrumbs: [
      { category: 'console', message: 'COMPLETE RÉSULTAT: {"email":"camille@exemple.fr"}' },
      { category: 'xhr', type: 'http', data: { url: '/api/portfolio' } },
      { category: 'navigation', message: 'Mon patrimoine', data: { from: '/outils', to: '/outils/portefeuille' } },
      { category: 'touch', message: 'Button' },
    ],
    contexts: { device: { name: 'iPhone de Camille', model: 'iPhone16,1' }, os: { name: 'iOS', version: '27.0' } },
    tags: { endroit: 'écran' },
  };
  const out = scrubEvent(event);
  assert.equal('user' in out, false);
  assert.equal('request' in out, false);
  assert.equal('extra' in out, false);
  assert.equal(out.message, 'Erreur pour [e-mail] : [montant] refusés');
  assert.equal(out.exception?.values?.[0].value, 'Solde [montant] introuvable pour [e-mail]');
  assert.deepEqual(out.breadcrumbs, [{ category: 'navigation', message: 'Mon patrimoine', data: undefined }]);
  assert.deepEqual(out.contexts, { device: { model: 'iPhone16,1' }, os: { name: 'iOS', version: '27.0' } });
  // Ce qui sert au diagnostic reste
  assert.deepEqual(out.tags, { endroit: 'écran' });
  assert.equal(out.exception?.values?.[0].type, 'Error');
  // L'original n'est pas modifié
  assert.equal(event.user.email, 'camille@exemple.fr');
});

test('rapport minimal : rien ne casse', () => {
  assert.deepEqual(scrubEvent({}), { breadcrumbs: [] });
  assert.deepEqual(scrubEvent({ exception: {} }), { exception: {}, breadcrumbs: [] });
});
