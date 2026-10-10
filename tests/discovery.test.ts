/// <reference types="node" />
// Lancer : npm test
// Leçons découvertes : conformes à src/lesson/discovery/lecons-decouvertes.md

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import type { Module } from '../src/context/ApiContext';
import {
  DISCOVERY,
  discoveryLesson,
  discoveryPlan,
  LEGACY_OBJECTIVES,
  nextLessonTitle,
  OBJECTIVE_OPTIONS,
  OBJECTIVES,
  type Objective,
  toObjective,
} from '../src/lesson/discovery';
import { computeFormula } from '../src/lesson/formulas';
import { rangeLine } from '../src/lesson/interactive';
import type { LessonScreen, Universe } from '../src/lesson/model';
import { normalizeLesson } from '../src/lesson/normalize';

const DOC = readFileSync(new URL('../src/lesson/discovery/lecons-decouvertes.md', import.meta.url), 'utf8');

// Comparaison de textes : apostrophes, espaces insécables, majuscule initiale
// et point final ne comptent pas
function plain(text: string): string {
  return text
    .replace(/[’‘]/g, "'")
    .replace(/[  ]/g, ' ')
    .toLowerCase()
    .replace(/[.\s]+$/, '')
    .trim();
}
const PLAIN_DOC = plain(DOC);

function stripAccents(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// Répliques du document : « (humeur) : « texte » »
const DOC_MOODS = new Map<string, string>();
for (const m of DOC.matchAll(/\(([a-zéè]+)\) : « ([^»]+) »/g)) DOC_MOODS.set(plain(m[2]), stripAccents(m[1]));

const FORBIDDEN = ['aube', 'voyage', 'continuer la marche', 'jargon', 'école', '5 minutes par jour'];

// Types d'écrans par leçon : tableau « Après la leçon » du document
const EXPECTED_TYPES: Record<Objective, string[]> = {
  epargner: ['slider', 'reveal', 'allocate', 'true_false', 'choice'],
  investir: ['slider', 'reveal', 'simulator', 'order', 'choice'],
  crypto: ['slider', 'reveal', 'true_false', 'dialogue', 'match'],
  logement: ['slider', 'reveal', 'simulator', 'order', 'choice'],
  impots: ['slider', 'reveal', 'true_false', 'match', 'choice'],
  decouvrir: ['slider', 'reveal', 'order', 'dialogue', 'choice'],
};

const TITLES: Record<Objective, string> = {
  epargner: 'L’argent qui fond',
  investir: 'La machine à intérêts',
  crypto: 'Le grand huit',
  logement: 'Le vrai prix d’un crédit',
  impots: 'Le mythe de la tranche',
  decouvrir: 'Ton vrai salaire',
};

const UNIVERSES: Record<Objective, string> = {
  epargner: 'avant-d-investir',
  investir: 'bourse',
  crypto: 'crypto',
  logement: 'se-loger',
  impots: 'impots',
  decouvrir: 'paie-primes-et-aides',
};

// Textes d'un écran qui doivent figurer mot pour mot dans le document
function documentTexts(s: LessonScreen): string[] {
  const texts: (string | null)[] = [s.question, s.subtitle, s.explanation];
  switch (s.kind) {
    case 'choice':
      texts.push(...s.options.map((o) => o.text));
      break;
    case 'true_false':
      texts.push(...s.cards.flatMap((c) => [c.statement, c.explanation]));
      break;
    case 'order':
      texts.push(...s.items.map((it) => it.text));
      break;
    case 'match':
      texts.push(...s.pairs.flatMap((p) => [p.left, p.right]));
      break;
    case 'allocate':
      texts.push(...s.buckets.flatMap((b) => [b.label, b.hint]), ...s.rules.map((r) => r.val?.line ?? null));
      break;
    case 'simulator':
      texts.push(s.label, ...s.ranges.map((r) => r.val.line));
      break;
    case 'dialogue':
      texts.push(s.character.role, ...s.messages, ...s.replies.flatMap((r) => [r.text, r.reaction]));
      break;
  }
  // Consigne ajoutée (le document n'en donne pas) et gabarits à compléter
  return texts.filter((t): t is string => !!t && t !== 'Vrai ou faux ?' && !t.includes('{'));
}

function valLines(s: LessonScreen) {
  return [s.val.intro, s.val.correct, s.val.wrong].filter((v) => v !== null);
}

function screens(o: Objective) {
  return discoveryLesson(o).screens;
}

// ---------------------------------------------------------------------------
// Objectifs
// ---------------------------------------------------------------------------
test('six objectifs du document, avec leur icône, leur univers conseillé et une phrase de Val', () => {
  assert.deepEqual([...OBJECTIVES], ['epargner', 'investir', 'crypto', 'logement', 'impots', 'decouvrir']);
  assert.deepEqual(
    OBJECTIVE_OPTIONS.map((o) => [o.value, o.icon]),
    [
      ['epargner', 'wallet-outline'],
      ['investir', 'trending-up-outline'],
      ['crypto', 'logo-bitcoin'],
      ['logement', 'home-outline'],
      ['impots', 'receipt-outline'],
      ['decouvrir', 'compass-outline'],
    ]
  );
  for (const o of OBJECTIVE_OPTIONS) assert.ok(PLAIN_DOC.includes(plain(o.label)), o.label);
  for (const o of OBJECTIVES) {
    const plan = DISCOVERY[o];
    assert.equal(plan.universe.slug, UNIVERSES[o], o);
    // La phrase de Val nomme l'univers et finit par « Moi, c'est Val. Et toi ? »
    assert.ok(plan.valLine.includes(`l’univers ${plan.universe.name}`), o);
    assert.ok(plan.valLine.endsWith('Moi, c’est Val. Et toi ?'), o);
    for (const word of FORBIDDEN) assert.ok(!plan.valLine.toLowerCase().includes(word), `${o} : ${word}`);
  }
  // Objectif inconnu : « je découvre »
  assert.equal(discoveryPlan(null), DISCOVERY.decouvrir);
});

test('anciens objectifs traduits vers le plus proche', () => {
  assert.deepEqual(LEGACY_OBJECTIVES, { comprendre: 'epargner', rouge: 'epargner', projet: 'logement' });
  assert.equal(toObjective('comprendre'), 'epargner');
  assert.equal(toObjective('rouge'), 'epargner');
  assert.equal(toObjective('projet'), 'logement');
  assert.equal(toObjective('crypto'), 'crypto');
  assert.equal(toObjective('devenir-riche'), null);
  assert.equal(toObjective('toString'), null);
  assert.equal(toObjective(undefined), null);
  assert.equal(discoveryPlan('projet' as Objective), DISCOVERY.logement);
});

test('prochaine leçon : la première de l’univers conseillé, sinon le premier module disponible', () => {
  const mod = (id: number, title?: string) => ({ id, lessons: title ? [{ title }] : [] }) as unknown as Module;
  const universe = (slug: string, moduleIds: number[]): Universe => ({ id: 1, slug, name: slug, description: null, position: 0, moduleIds });
  const modules = [mod(1, 'Budget de base'), mod(2), mod(3, 'Le compte courant')];

  // Première leçon publiée de l'univers conseillé (le module 2 est vide)
  assert.equal(nextLessonTitle(DISCOVERY.crypto, [universe('crypto', [2, 3])], modules), 'Le compte courant');
  // Univers sans module publié : premier module disponible
  assert.equal(nextLessonTitle(DISCOVERY.crypto, [universe('crypto', [])], modules), 'Budget de base');
  // Rien de chargé (pas encore de compte)
  assert.equal(nextLessonTitle(DISCOVERY.crypto, [], []), null);
});

// ---------------------------------------------------------------------------
// Les six leçons
// ---------------------------------------------------------------------------
test('chaque leçon : son titre, 5 écrans, jamais deux fois le même type, dans l’ordre du document', () => {
  for (const o of OBJECTIVES) {
    const lesson = discoveryLesson(o);
    assert.equal(lesson.title, TITLES[o], o);
    const types = lesson.screens.map((s) => s.kind);
    assert.deepEqual(types, EXPECTED_TYPES[o], o);
    assert.equal(new Set(types).size, 5, `${o} : type en double`);
    // Pari et révélation non notés, les trois écrans suivants notés (sauf le simulateur)
    lesson.screens.forEach((s) => assert.equal(s.scored, !['slider', 'reveal', 'simulator'].includes(s.kind), `${o} #${s.index}`));
    // Dernier écran noté
    assert.equal(lesson.screens[4].scored, true, o);
  }
});

test('chaque question a exactement une bonne réponse', () => {
  for (const o of OBJECTIVES) {
    for (const s of screens(o)) {
      if (s.kind === 'choice') assert.equal(s.options.filter((x) => x.correct).length, 1, `${o} #${s.index}`);
      if (s.kind === 'dialogue') assert.equal(s.replies.filter((r) => r.correct).length, 1, `${o} #${s.index}`);
      if (s.kind === 'true_false') assert.equal(s.cards.length, 4, o);
      if (s.kind === 'match') assert.equal(s.pairs.length, 4, o);
      if (s.kind === 'order') {
        assert.equal(s.items.length, 4, o);
        // Présentés dans le désordre : aucun élément à sa place au départ
        s.start.forEach((id, i) => assert.notEqual(id, s.items[i].id, `${o} : ${id} déjà à sa place`));
      }
      if (s.kind === 'match') s.rightOrder.forEach((id, i) => assert.notEqual(id, s.pairs[i].id, `${o} : ${id} en face de sa paire`));
    }
  }
});

test('textes : repris mot pour mot du document, sans mot interdit', () => {
  for (const o of OBJECTIVES) {
    for (const s of screens(o)) {
      for (const text of [...documentTexts(s), ...valLines(s).map((v) => v.line).filter((l) => !l.includes('{'))]) {
        assert.ok(PLAIN_DOC.includes(plain(text)), `${o} #${s.index} absent du document : « ${text} »`);
        for (const word of FORBIDDEN) assert.ok(!text.toLowerCase().includes(word), `${o} : ${word}`);
      }
    }
  }
});

test('répliques de Val : l’humeur du document', () => {
  let checked = 0;
  for (const o of OBJECTIVES) {
    for (const s of screens(o)) {
      const lines = [...valLines(s), ...(s.kind === 'allocate' ? s.rules.map((r) => r.val).filter((v) => v !== null) : [])];
      for (const v of lines) {
        // Gabarit : comparé sans ses valeurs
        const key = plain(v.line.includes('{') ? v.line.replace(/\{epargne\}/, '<épargne>').replace(/\{epargne\*12\}/, '<épargne × 12>') : v.line);
        const mood = DOC_MOODS.get(key);
        assert.ok(mood, `${o} #${s.index} : réplique sans humeur dans le document « ${v.line} »`);
        assert.equal(v.mood, mood, `${o} #${s.index} « ${v.line} »`);
        checked++;
      }
      if (s.kind === 'simulator') s.ranges.forEach((r) => assert.equal(r.val.mood, 'complice', o));
    }
  }
  assert.ok(checked >= 40, `seulement ${checked} répliques vérifiées`);
});

test('paris : curseurs du document, et la vraie valeur dans la plage', () => {
  const sliders: Record<Objective, [number, number, number, number]> = {
    epargner: [500, 1200, 10, 1000],
    investir: [30000, 150000, 1000, 45000],
    crypto: [0, 100000, 1000, 60000],
    logement: [200000, 400000, 5000, 230000],
    impots: [0, 3000, 10, 1500],
    decouvrir: [1660, 4000, 50, 2000],
  };
  for (const o of OBJECTIVES) {
    const [pari, reveal] = screens(o);
    assert.ok(pari.kind === 'slider' && reveal.kind === 'reveal');
    assert.deepEqual([pari.min, pari.max, pari.step, pari.start], sliders[o], o);
    assert.equal(reveal.fromScreen, 0, o);
    assert.ok(pari.min <= reveal.value && reveal.value <= pari.max, o);
  }
});

test('révélations : valeurs, ligne clé et lignes atténuées du document', () => {
  const expected: Record<Objective, { value: number; key: number | string; dim: boolean }> = {
    epargner: { value: 820, key: 820, dim: true },
    investir: { value: 81500, key: 45500, dim: true },
    crypto: { value: 16500, key: '76 %', dim: true },
    logement: { value: 300000, key: 100000, dim: true },
    impots: { value: 410, key: 410, dim: true },
    decouvrir: { value: 3055, key: 3055, dim: false },
  };
  for (const o of OBJECTIVES) {
    const reveal = screens(o)[1];
    assert.ok(reveal.kind === 'reveal');
    assert.equal(reveal.value, expected[o].value, o);
    const keys = reveal.lines.filter((l) => l.key);
    assert.equal(keys.length, 1, `${o} : une seule ligne clé`);
    assert.equal(keys[0].value, expected[o].key, o);
    assert.equal(reveal.lines.some((l) => l.dim), expected[o].dim, `${o} : ligne atténuée`);
  }
  // Calculs des révélations
  assert.equal(Math.round(1000 / Math.pow(1.02, 10) / 10) * 10, 820);
  assert.equal(36000 + 45500, 81500);
  assert.equal(Math.round((1 - 16500 / 69000) * 100), 76);
  assert.equal(Math.round(1000 * (16500 / 69000) / 10) * 10, 240);
  assert.equal(200000 + 100000, 300000);
  assert.equal(1000 * 0.11 + 1000 * 0.3, 410);
  assert.equal(1660 + 470, 2130);
  assert.equal(2130 + 925, 3055);
  // Pari de la leçon 2 : la formule du simulateur redonne la révélation
  const at30years = computeFormula('savings_from_age', 35, { monthly: 100, rate: 0.05, end_age: 65 });
  assert.ok(Math.abs(at30years.capital - 81500) / 81500 < 0.01);
  assert.equal(at30years.paid, 36000);
});

// Repère du document : à 1 % près, ou à son arrondi (« environ 41 000 € »)
function near(actual: number, reference: number, rounding = 0) {
  const ok = Math.abs(actual - reference) <= Math.max(reference * 0.01, rounding / 2);
  assert.ok(ok, `${Math.round(actual)} au lieu d’environ ${reference}`);
}

test('simulateur de la leçon 2 : capital à 65 ans selon l’âge de départ (repères du document)', () => {
  const s = screens('investir')[2];
  assert.ok(s.kind === 'simulator');
  assert.deepEqual([s.min, s.max, s.step, s.start, s.label], [20, 50, 1, 30, 'Âge de départ']);
  const at = (age: number) => computeFormula(s.formula, age, s.params);
  near(at(20).capital, 196000);
  near(at(30).capital, 111000);
  // 40 580 € : le document arrondit au millier
  near(at(45).capital, 41000, 1000);
  assert.equal(at(30).paid, 100 * 35 * 12);
  // Réplique de Val selon la plage
  assert.equal(rangeLine(s.ranges, 20)?.line, 'Commencer tôt, c’est le meilleur cadeau à te faire.');
  assert.equal(rangeLine(s.ranges, 29)?.line, 'Commencer tôt, c’est le meilleur cadeau à te faire.');
  assert.equal(rangeLine(s.ranges, 30)?.line, 'Chaque année gagnée compte, et il n’est pas trop tard.');
  assert.equal(rangeLine(s.ranges, 40)?.line, 'Chaque année gagnée compte, et il n’est pas trop tard.');
  assert.equal(rangeLine(s.ranges, 41)?.line, 'Moins de temps, donc plus d’effort par mois : mais ça reste utile.');
  assert.equal(rangeLine(s.ranges, 50)?.line, 'Moins de temps, donc plus d’effort par mois : mais ça reste utile.');
});

test('simulateur de la leçon 4 : mensualité et intérêts selon la durée (repères du document)', () => {
  const s = screens('logement')[2];
  assert.ok(s.kind === 'simulator');
  assert.deepEqual([s.min, s.max, s.step, s.start, s.label], [15, 25, 1, 25, 'Durée']);
  const at = (years: number) => computeFormula(s.formula, years, s.params);
  near(at(15).monthly, 1430);
  near(at(15).interest, 57000);
  near(at(20).monthly, 1160);
  near(at(20).interest, 78000);
  near(at(25).monthly, 1000);
  near(at(25).interest, 100000);
  // Une seule réplique, quelle que soit la durée
  assert.equal(rangeLine(s.ranges, 15), rangeLine(s.ranges, 25));
});

test('répartir de la leçon 1 : 1 800 €, pots et règles du document', () => {
  const s = screens('epargner')[2];
  assert.ok(s.kind === 'allocate');
  assert.equal(s.total, 1800);
  assert.equal(s.step, 10);
  assert.deepEqual(
    s.buckets.map((b) => [b.key, b.start, b.reservoir]),
    [
      ['besoins', 1260, false],
      ['envies', 540, true],
      ['epargne', 0, false],
    ]
  );
  assert.deepEqual(
    s.rules.map((r) => [r.bucket, r.min]),
    [
      ['epargne', 180],
      ['besoins', 900],
    ]
  );
  assert.equal(180, 1800 * 0.1);
});

test('impôts : le barème simplifié donne bien 410 € et un taux moyen de 12,7 % pour Léa', () => {
  const tax = (income: number) =>
    Math.max(0, Math.min(income, 30000) - 11000) * 0.11 + Math.max(0, income - 30000) * 0.3;
  assert.equal(Math.round(tax(31000) - tax(29000)), 410);
  assert.equal(Math.round((tax(40000) / 40000) * 1000) / 10, 12.7);
  // Le barème est annoncé comme simplifié, sous la question du pari
  const pari = screens('impots')[0];
  assert.ok(pari.subtitle?.startsWith('Barème simplifié'));
});

test('format des écrans interactifs : un écran mal formé tombe sur l’écran de secours', () => {
  const bad = normalizeLesson({
    screens: [
      { type: 'true_false', payload: { cards: [] } },
      { type: 'order', payload: { items: [{ id: 'a', text: 'Seul' }] } },
      { type: 'match', payload: { pairs: [] } },
      // Format à cibles du site, sans règles : pas encore géré
      { type: 'allocate', payload: { total: 100, buckets: [{ key: 'a', target: 100 }] } },
      { type: 'simulator', payload: { min: 1, max: 2, formula: 'x', outputs: [] } },
      { type: 'dialogue', payload: { character: { name: 'Léo' }, messages: [], replies: [] } },
    ],
  });
  assert.deepEqual(
    bad.screens.map((s) => s.kind),
    Array(6).fill('unsupported')
  );
});
