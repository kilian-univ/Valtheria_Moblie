/// <reference types="node" />
// Lancer : npm test

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { runSafely } from '../src/utils/safe';

test('démarrage : une tâche secondaire qui plante ne remonte jamais', async () => {
  // Erreur immédiate
  assert.doesNotThrow(() =>
    runSafely('rappels', () => {
      throw new Error('module natif absent');
    })
  );
  // Promesse rejetée : aucune promesse non gérée
  let unhandled = false;
  const onUnhandled = () => {
    unhandled = true;
  };
  process.on('unhandledRejection', onUnhandled);
  runSafely('mémoire du parcours', () => Promise.reject(new Error('stockage illisible')));
  await new Promise((r) => setTimeout(r, 10));
  process.off('unhandledRejection', onUnhandled);
  assert.equal(unhandled, false);
  // Tâche normale : bien exécutée
  let ran = false;
  runSafely('mesure', () => {
    ran = true;
  });
  assert.equal(ran, true);
});
