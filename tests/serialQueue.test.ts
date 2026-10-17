import assert from 'node:assert/strict';
import { test } from 'node:test';

import { serialQueue } from '@/src/utils/serialQueue';

test('deux lectures-modifications-écritures rapprochées : aucune ne se perd', async () => {
  let stored: string[] = [];
  const inOrder = serialQueue();
  const add = (x: string) =>
    inOrder(async () => {
      const current = stored;
      await new Promise((r) => setTimeout(r, 5));
      stored = [...current, x];
    });
  await Promise.all([add('a'), add('b'), add('c')]);
  assert.deepEqual(stored, ['a', 'b', 'c']);
});

test('une tâche en échec ne bloque pas les suivantes', async () => {
  const inOrder = serialQueue();
  await assert.rejects(inOrder(async () => { throw new Error('boum'); }));
  assert.equal(await inOrder(async () => 42), 42);
});
