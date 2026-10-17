import assert from 'node:assert/strict';
import { test } from 'node:test';

import { appendLoggedError, ERROR_LOG_SIZE, errorEntry, parseErrorLog } from '@/src/utils/errorLog';

const AT = new Date('2026-10-17T12:00:00Z');

test('une erreur donne une entrée datée, avec son message et sa pile', () => {
  const e = errorEntry('écran', new TypeError("Cannot read properties of undefined (reading 'depenses')"), AT);
  assert.equal(e.at, '2026-10-17T12:00:00.000Z');
  assert.equal(e.where, 'écran');
  assert.match(e.message, /depenses/);
  assert.ok(e.stack && e.stack.length <= 1500);
});

test('une valeur lancée qui n’est pas une Error reste lisible', () => {
  assert.equal(errorEntry('app', 'boum', AT).message, 'boum');
  assert.equal(errorEntry('app', 'boum', AT).stack, null);
});

test('le journal garde les plus récentes en tête, et reste borné', () => {
  let list = parseErrorLog(null);
  for (let i = 0; i < ERROR_LOG_SIZE + 5; i++) list = appendLoggedError(list, errorEntry('écran', new Error(`n${i}`), AT));
  assert.equal(list.length, ERROR_LOG_SIZE);
  assert.equal(list[0].message, `n${ERROR_LOG_SIZE + 4}`);
});

test('un journal illisible repart vide au lieu de planter', () => {
  assert.deepEqual(parseErrorLog('{pas du json'), []);
  assert.deepEqual(parseErrorLog('{"a":1}'), []);
  assert.equal(parseErrorLog(JSON.stringify([{ message: 'ok', where: 'x', at: 'y', stack: null }, 3])).length, 1);
});

test('erreur d’une action : jamais de message technique', async () => {
  const { actionErrorText } = await import('@/src/utils/loadError');
  assert.equal(actionErrorText(new Error('Erreur API'), 'Suppression impossible.'), 'Suppression impossible.');
  assert.equal(actionErrorText(new Error('Server Error'), 'Suppression impossible.'), 'Suppression impossible.');
  assert.match(actionErrorText(new TypeError('Failed to fetch'), 'x'), /Pas de connexion internet/);
  assert.equal(actionErrorText(new Error('Ce pseudo est déjà pris.'), 'x'), 'Ce pseudo est déjà pris.');
  assert.equal(actionErrorText(new TypeError('Network request failed'), 'x', 'Hors ligne.'), 'Hors ligne.');
});
