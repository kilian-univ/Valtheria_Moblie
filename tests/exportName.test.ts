import assert from 'node:assert/strict';
import { test } from 'node:test';

import { exportFileName } from '@/src/utils/exportName';

test('export : un fichier JSON daté', () => {
  assert.equal(exportFileName(new Date(2026, 9, 7)), 'valtheria-mes-donnees-2026-10-07.json');
});
