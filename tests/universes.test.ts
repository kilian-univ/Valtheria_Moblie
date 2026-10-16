/// <reference types="node" />
// Lancer : npm test

import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { Module } from '../src/context/ApiContext';
import { moduleUniverse, normalizeUniverses } from '../src/lesson/normalize';
import { MODULE_COLOR_ORDER, moduleColorKey, universeColorKey } from '../src/utils/modulePath';
import {
  DEFAULT_UNIVERSE_ICON,
  fetchUniverses,
  groupByFamily,
  UNIVERSE_ARTS,
  UNIVERSE_FAMILIES,
  universeArt,
  universeFamily,
  modulesOutsideUniverses,
  modulesProgressLabel,
  UNIVERSE_ICONS,
  universeBannerLabel,
  universeIcon,
  visibleUniverses,
} from '../src/utils/universes';

function mod(id: number, extra: Partial<Module> = {}, done: boolean[] = [false]): Module {
  return {
    id,
    slug: `m${id}`,
    title: `Module ${id}`,
    lessons_count: done.length,
    lessons_completed: done.filter(Boolean).length,
    lessons: done.map((completed, i) => ({ id: id * 100 + i, slug: `l${i}`, title: 'L', xp_reward: 10, completed })),
    ...extra,
  };
}

const RAW = [
  { id: 2, slug: 'bourse', name: 'Bourse', description: null, position: 2, module_ids: [3] },
  { id: 1, slug: 'avant-d-investir', name: "Avant d'investir", description: 'Avant le premier euro', position: 1, module_ids: [2, 1] },
  { id: 3, slug: 'crypto', name: 'Crypto', description: 'Sans hype', position: 3, module_ids: [] },
];

// ---------------------------------------------------------------------------
// Lecture de module.universe
// ---------------------------------------------------------------------------
test('universe présent : id, slug, name', () => {
  const m = mod(1, { universe: { id: 1, slug: 'avant-d-investir', name: "Avant d'investir" } });
  assert.deepEqual(moduleUniverse(m), { id: 1, slug: 'avant-d-investir', name: "Avant d'investir" });
});

test('universe absent (serveur pas encore à jour) → null', () => {
  assert.equal(moduleUniverse(mod(1)), null);
});

test('universe null → null', () => {
  assert.equal(moduleUniverse(mod(1, { universe: null })), null);
});

test('universe mal formé (sans id ou sans nom) → null', () => {
  assert.equal(moduleUniverse(mod(1, { universe: { slug: 'x', name: 'X' } })), null);
  assert.equal(moduleUniverse(mod(1, { universe: { id: 4, slug: 'x', name: '' } })), null);
  assert.equal(moduleUniverse(mod(1, { universe: 'Bourse' })), null);
});

// ---------------------------------------------------------------------------
// GET /universes
// ---------------------------------------------------------------------------
test('liste triée par position, module_ids lus', () => {
  const list = normalizeUniverses(RAW);
  assert.deepEqual(
    list.map((u) => u.slug),
    ['avant-d-investir', 'bourse', 'crypto']
  );
  assert.deepEqual(list[0], {
    id: 1,
    slug: 'avant-d-investir',
    name: "Avant d'investir",
    description: 'Avant le premier euro',
    position: 1,
    moduleIds: [2, 1],
  });
  assert.equal(list[1].description, null);
});

test('réponse qui n’est pas une liste → aucun univers', () => {
  assert.deepEqual(normalizeUniverses(null), []);
  assert.deepEqual(normalizeUniverses({ message: 'Not found' }), []);
});

test('repli : /universes en 404 ou en erreur → null, sans exception', async () => {
  const notFound = async () => {
    throw new Error('The route api/universes could not be found.');
  };
  const offline = async () => {
    throw new TypeError('Network request failed');
  };
  assert.equal(await fetchUniverses(notFound), null);
  assert.equal(await fetchUniverses(offline), null);
});

test('/universes appelé par la fonction générique get()', async () => {
  const paths: string[] = [];
  const list = await fetchUniverses(async (path) => {
    paths.push(path);
    return RAW;
  });
  assert.deepEqual(paths, ['/universes']);
  assert.equal(list?.length, 3);
});

// ---------------------------------------------------------------------------
// Accueil : univers visibles
// ---------------------------------------------------------------------------
test('univers sans module publié masqués, ordre de position et de module_ids', () => {
  const modules = [mod(1, {}, [true, true]), mod(2, {}, [true, false]), mod(3)];
  const entries = visibleUniverses(normalizeUniverses(RAW), modules);
  assert.deepEqual(
    entries.map((e) => e.universe.slug),
    ['avant-d-investir', 'bourse']
  );
  assert.deepEqual(
    entries[0].modules.map((m) => m.id),
    [2, 1]
  );
  assert.equal(entries[0].done, 1);
  assert.equal(entries[0].progress, 3 / 4);
});

test('univers dont les modules ne sont pas dans GET /modules (brouillons) masqués', () => {
  const entries = visibleUniverses(normalizeUniverses(RAW), [mod(3)]);
  assert.deepEqual(
    entries.map((e) => e.universe.slug),
    ['bourse']
  );
});

test('modules sans univers listés à part, dans l’ordre du serveur', () => {
  const modules = [mod(7), mod(1), mod(3), mod(8)];
  const entries = visibleUniverses(normalizeUniverses(RAW), modules);
  assert.deepEqual(
    modulesOutsideUniverses(entries, modules).map((m) => m.id),
    [7, 8]
  );
});

test('aucun univers → liste vide (l’accueil garde les modules)', () => {
  assert.deepEqual(visibleUniverses([], [mod(1)]), []);
});

// ---------------------------------------------------------------------------
// Couleur
// ---------------------------------------------------------------------------
test('couleur d’un univers : (position - 1) modulo 4, stable', () => {
  const [a, b] = normalizeUniverses(RAW);
  assert.equal(universeColorKey(a), 'ardoise'); // position 1 : première couleur
  assert.equal(universeColorKey(b), 'sarcelle'); // position 2
  assert.equal(universeColorKey({ ...a, position: 4 }), 'ivoire');
  assert.equal(universeColorKey({ ...a, position: 5 }), 'ardoise'); // on reboucle
  assert.equal(universeColorKey({ ...a, position: 0 }), 'ivoire'); // jamais d'index négatif
  assert.deepEqual(
    [1, 2, 3, 4].map((position) => universeColorKey({ ...a, position })),
    [...MODULE_COLOR_ORDER]
  );
});

test('module d’un univers : couleur de l’univers, quel que soit son rang', () => {
  const universes = normalizeUniverses(RAW);
  const ref = { id: 1, slug: 'avant-d-investir', name: "Avant d'investir" };
  const modules = [mod(9), mod(1, { universe: ref }), mod(2, { universe: ref })];
  // Le module 1 est 2e de la liste (règle actuelle : sarcelle) : l'univers l'emporte
  assert.equal(moduleColorKey(modules, 1, universes), 'ardoise');
  assert.equal(moduleColorKey(modules, 2, universes), 'ardoise');
  // Même résultat si l'ordre des modules change
  assert.equal(moduleColorKey([...modules].reverse(), 1, universes), 'ardoise');
});

test('module rangé seulement par module_ids : couleur de l’univers', () => {
  assert.equal(moduleColorKey([mod(5), mod(3)], 3, normalizeUniverses(RAW)), 'sarcelle');
});

test('sans univers : règle actuelle (rang modulo 4)', () => {
  const modules = [mod(1), mod(2), mod(3), mod(4), mod(5)];
  assert.equal(moduleColorKey(modules, 1), 'ardoise');
  assert.equal(moduleColorKey(modules, 2, []), 'sarcelle');
  assert.equal(moduleColorKey(modules, 5, []), 'ardoise');
  // Univers connu du module mais /universes indisponible : règle actuelle
  const withRef = [mod(1), mod(2, { universe: { id: 1, slug: 's', name: 'S' } })];
  assert.equal(moduleColorKey(withRef, 2, []), 'sarcelle');
});

// ---------------------------------------------------------------------------
// Libellés et icônes
// ---------------------------------------------------------------------------
test('« X modules sur Y terminés » accordé', () => {
  assert.equal(modulesProgressLabel(0, 3), '0 module sur 3 terminé');
  assert.equal(modulesProgressLabel(1, 3), '1 module sur 3 terminé');
  assert.equal(modulesProgressLabel(2, 3), '2 modules sur 3 terminés');
});

test('bannière : « UNIVERS <NOM> », rien sans univers', () => {
  assert.equal(universeBannerLabel("Avant d'investir"), "UNIVERS AVANT D'INVESTIR");
  assert.equal(universeBannerLabel(null), null);
});

test('icône par slug, icône par défaut pour un univers inconnu', () => {
  assert.equal(universeIcon('bourse'), 'trending-up-outline');
  assert.equal(universeIcon('inconnu'), DEFAULT_UNIVERSE_ICON);
  assert.equal(universeIcon('constructor'), DEFAULT_UNIVERSE_ICON);
});

// L'ordre des clés de UNIVERSE_ICONS DOIT suivre le champ `ordre` du serveur
// (ThemesResetSeeder du site, renvoyé comme `position` par GET /api/universes) :
// sans compte, les univers ne sont pas chargés, et la couleur d'une pastille
// (accueil, leçons découvertes) se déduit de ce rang. Si le serveur réordonne
// ses univers, mettre à jour la liste de l'app ET ce test.
test('les 15 univers de l’app suivent l’ordre du serveur (champ ordre)', () => {
  assert.deepEqual(Object.keys(UNIVERSE_ICONS), [
    'avant-d-investir', // 1
    'bourse', // 2
    'crypto', // 3
    'immobilier', // 4
    'investir-autrement', // 5
    'paie-primes-et-aides', // 6
    'revenus-annexes', // 7
    'entreprendre', // 8
    'garder-la-main', // 9
    'se-loger', // 10
    'savoir-s-endetter', // 11
    'impots', // 12
    'macroeconomie', // 13
    'prix-marches', // 14
    'analyser-une-entreprise', // 15
  ]);
});

// ---------------------------------------------------------------------------
// Illustrations et familles
// ---------------------------------------------------------------------------

test('chacun des 15 univers a son illustration ; un inconnu garde un décor', () => {
  assert.equal(UNIVERSE_ARTS.length, 15);
  for (const slug of Object.keys(UNIVERSE_ICONS)) {
    assert.deepEqual(universeArt(slug), { kind: 'art', name: slug });
  }
  assert.deepEqual(universeArt('inconnu'), { kind: 'decor', name: 'plante' });
});

test('les quatre familles couvrent les 15 univers, sans doublon', () => {
  assert.deepEqual(
    UNIVERSE_FAMILIES.map((f) => f.title),
    ['Investir', 'Gagner de l’argent', 'Gérer au quotidien', 'Comprendre l’économie']
  );
  const all = UNIVERSE_FAMILIES.flatMap((f) => f.slugs);
  assert.equal(new Set(all).size, 15);
  assert.deepEqual([...all].sort(), Object.keys(UNIVERSE_ICONS).sort());
  assert.equal(universeFamily('bourse')?.key, 'investir');
  assert.equal(universeFamily('entreprendre')?.key, 'gagner');
  assert.equal(universeFamily('impots')?.key, 'gerer');
  assert.equal(universeFamily('analyser-une-entreprise')?.key, 'comprendre');
  assert.equal(universeFamily('inconnu'), null);
});

test('groupByFamily : ordre des familles, ordre reçu dedans, inconnus à la fin', () => {
  const u = (id: number, slug: string) => ({ universe: { id, slug, name: slug, description: null, position: id, moduleIds: [] } });
  const groups = groupByFamily([u(1, 'impots'), u(2, 'nouveau'), u(3, 'crypto'), u(4, 'bourse'), u(5, 'se-loger')]);
  assert.deepEqual(
    groups.map((g) => [g.title, g.entries.map((e) => e.universe.slug)]),
    [
      ['Investir', ['crypto', 'bourse']],
      ['Gérer au quotidien', ['impots', 'se-loger']],
      ['Autres univers', ['nouveau']],
    ]
  );
});
