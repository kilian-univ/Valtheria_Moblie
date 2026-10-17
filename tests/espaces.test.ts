/// <reference types="node" />
// Lancer : npm test
// Garde-fou des espaces insécables : le 17/10/2026, les « insécables » du
// patrimoine étaient des espaces ordinaires (collées dans le source,
// invisibles), et les montants se coupaient en fin de ligne (« 900 / € »).

import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { DISCOVERY, discoveryLesson, OBJECTIVES } from '@/src/lesson/discovery';
import { formatAmount, formatInteger, formatVariationPercent } from '@/src/utils/format';
import { frenchSpaces, NBSP, NNBSP } from '@/src/utils/frenchSpaces';
import { money, quantityLabel, signedMoney } from '@/src/utils/patrimoine/format';

const root = fileURLToPath(new URL('../', import.meta.url));

function sources(dir: string): string[] {
  return readdirSync(join(root, dir)).flatMap((name) => {
    const path = join(root, dir, name);
    if (statSync(path).isDirectory()) return sources(relative(root, path));
    return /\.(ts|tsx)$/.test(name) ? [relative(root, path)] : [];
  });
}
const FILES = [...sources('src'), ...sources('app')];

test('les deux espaces ont une seule source, écrite en échappement', () => {
  assert.equal(NBSP, ' ');
  assert.equal(NNBSP, ' ');
  const decl = /const\s+(NBSP|NNBSP)\s*=/;
  const others = FILES.filter((f) => f !== 'src/utils/frenchSpaces.ts' && decl.test(readFileSync(join(root, f), 'utf8')));
  assert.deepEqual(others, [], 'importer NBSP et NNBSP de src/utils/frenchSpaces.ts');
  // Une espace invisible collée dans le source se perd sans bruit : jamais de
  // caractère littéral dans une déclaration
  const source = readFileSync(join(root, 'src/utils/frenchSpaces.ts'), 'utf8');
  assert.ok(!/[  ]/.test(source.split('\n').filter((l) => /^export const N+BSP/.test(l)).join('\n')));
});

test('aucun écran n’affiche le Text brut de React Native', () => {
  const rnImport = /import\s*\{([^}]*)\}\s*from\s*['"]react-native['"]/g;
  const offenders = FILES.filter((f) => {
    if (f === 'src/components/common/Text.tsx') return false;
    const s = readFileSync(join(root, f), 'utf8');
    return [...s.matchAll(rnImport)].some((m) => m[1].split(',').some((n) => /^\s*Text\s*(as\s+\w+\s*)?$/.test(n)));
  });
  assert.deepEqual(offenders, [], 'utiliser AppText, ou Text de src/components/common/Text.tsx (espaces insécables)');
});

test('formateurs : milliers en fine insécable, unité et signe en insécable', () => {
  assert.equal(money(27071), '27 071 €');
  assert.equal(signedMoney(-1400), '− 1 400 €');
  assert.equal(quantityLabel(1234.5, 'BTC', 'crypto'), '1 234,5 BTC');
  assert.equal(formatAmount(27071), '27 071,00 €');
  assert.equal(formatVariationPercent(3.45), '+ 3,5 %');
  assert.equal(formatInteger(3147), '3 147');
});

// Aucune coupure possible : chiffre puis unité, milliers, ponctuation double
const BREAKABLE = [/\d [€%$]/, /\d \d{3}(?!\d)/, /[^\s] [?!;:](\s|$)/, /« | »/];

test('leçons découvertes : plus aucune coupure possible une fois affichées', () => {
  const strings: string[] = [];
  const walk = (v: unknown) => {
    if (typeof v === 'string') strings.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  for (const o of OBJECTIVES) {
    walk(discoveryLesson(o));
    walk(DISCOVERY[o]);
  }
  assert.ok(strings.length > 200, 'tout le texte des six leçons');
  const left = strings.map((s) => frenchSpaces(s)).filter((s) => BREAKABLE.some((re) => re.test(s)));
  assert.deepEqual(left, []);
});
