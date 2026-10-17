/// <reference types="node" />
// Lancer : npm test
// Chiffres réglementaires du site (GET /regulatory-figures) dans les leçons
// découvertes : lecture de la route, valeurs de secours, montants recalculés.

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { discoveryLesson } from '@/src/lesson/discovery';
import type { LessonScreen } from '@/src/lesson/model';
import {
  FALLBACK_FIGURES,
  figureNumbers,
  fillFigures,
  parseFigures,
  withFallback,
  type Figures,
} from '@/src/utils/regulatoryFigures';

// Réponse réelle de la route (extrait de la production, 17/10/2026)
const ROUTE = {
  data: [
    { key: 'crypto_taux_imposition', value: '31,4 %', value_format: 'percent', effective_at: null, verified_at: '2026-09-08T07:18:01+00:00' },
    { key: 'livret_a_taux', value: '1,7 %', value_format: 'percent', effective_at: '2026-08-01', verified_at: '2026-10-17T12:00:00+00:00' },
    { key: '', value: 'x' },
    { key: 'sans_valeur', value: '' },
    'n’importe quoi',
  ],
  meta: { count: 2 },
};

const plain = (s: string) => s.replace(/[  ]/g, ' ');
const screensOf = (o: Parameters<typeof discoveryLesson>[0], f?: Figures) => discoveryLesson(o, f).screens as LessonScreen[];
const textOf = (o: Parameters<typeof discoveryLesson>[0], f?: Figures) => plain(JSON.stringify(screensOf(o, f)));

test('route : lue une fois, lignes illisibles écartées, réponse vide = rien', () => {
  const f = parseFigures(ROUTE)!;
  assert.deepEqual(Object.keys(f).sort(), ['crypto_taux_imposition', 'livret_a_taux']);
  assert.deepEqual(f.livret_a_taux, { value: '1,7 %', effectiveAt: '2026-08-01', verifiedAt: '2026-10-17T12:00:00+00:00' });
  assert.equal(parseFigures({ data: [] }), null);
  assert.equal(parseFigures('Server Error'), null);
  assert.equal(parseFigures(null), null);
});

test('secours : les valeurs reçues remplacent celles de secours, clé par clé', () => {
  const f = withFallback({ crypto_taux_imposition: { value: '32 %', effectiveAt: null, verifiedAt: null } });
  assert.equal(f.crypto_taux_imposition.value, '32 %');
  assert.equal(f.ir_bareme_seuils.value, FALLBACK_FIGURES.ir_bareme_seuils.value);
  assert.equal(fillFigures('Imposé à {{crypto_taux_imposition}}.', f), 'Imposé à 32 %.');
  // Clé inconnue : jamais le repère à l'écran
  assert.equal(fillFigures('Taux : {{cle_inconnue}}.', f), 'Taux : .');
  assert.deepEqual(figureNumbers('0 € / 11 600 € / 29 579 €'), [0, 11600, 29579]);
  assert.deepEqual(figureNumbers('25 ans'), [25]);
});

test('sans réponse de la route : les leçons gardent les montants du document', () => {
  const impots = screensOf('impots');
  assert.equal(impots[1].kind === 'reveal' && impots[1].value, 410);
  const epargner = screensOf('epargner');
  assert.equal(epargner[1].kind === 'reveal' && epargner[1].value, 820);
  const logement = screensOf('logement');
  assert.equal(logement[1].kind === 'reveal' && logement[1].value, 300000);
  assert.match(textOf('crypto'), /imposé à 31,4 %, sauf si tes ventes de l’année ne dépassent pas 305 €/);
  assert.ok(!textOf('crypto').includes('{{'), 'aucun repère à l’écran');
});

test('impôts : un nouveau barème change la question, les montants et le taux de Léa', () => {
  const f = withFallback({
    ir_bareme_taux: { value: '0 % / 11 % / 32 % / 41 % / 45 %', effectiveAt: null, verifiedAt: null },
    ir_bareme_seuils: { value: '0 € / 12 000 € / 30 500 € / 85 000 € / 182 000 €', effectiveAt: null, verifiedAt: null },
  });
  const s = screensOf('impots', f);
  const text = textOf('impots', f);
  assert.match(text, /de 29 500 € à 31 500 €, et tu changes de tranche : de 11 % à 32 %/);
  assert.match(text, /0 % jusqu’à 12 000 €, 11 % jusqu’à 30 500 €, 32 % au-delà/);
  // 1 000 € à 11 % + 1 000 € à 32 % = 430 €
  assert.equal(s[1].kind === 'reveal' && s[1].value, 430);
  // Léa : (30 500 − 12 000) × 11 % + (40 000 − 30 500) × 32 % = 5 075 € → 12,7 %
  assert.match(text, /Son taux moyen est d’environ 12,7 %, bien en dessous de 32 %/);
  // Aucune option ne garde l’ancien taux en dur
  assert.match(text, /Non, il est plus haut que 32 %/);
  assert.doesNotMatch(text, /30 %/);
});

test('impôts : un barème incohérent retombe sur celui de secours', () => {
  const f = withFallback({ ir_bareme_seuils: { value: '0 € / 50 000 € / 20 000 €', effectiveAt: null, verifiedAt: null } });
  assert.match(textOf('impots', f), /0 % jusqu’à 11 600 €, 11 % jusqu’à 29 579 €/);
});

test('épargner : l’inflation reçue recalcule ce que 1 000 € achètent encore', () => {
  const f = withFallback({ inflation_annuelle: { value: '3 %', effectiveAt: null, verifiedAt: null } });
  const s = screensOf('epargner', f);
  // 1 000 / 1,03^10 = 744 → arrondi à la dizaine
  assert.equal(s[1].kind === 'reveal' && s[1].value, 740);
  assert.match(textOf('epargner', f), /Avec 3 % d’inflation par an/);
  assert.match(textOf('epargner', f), /3 % par an est une hypothèse/);
});

test('logement : la durée maximale reçue fixe le curseur et le coût', () => {
  const f = withFallback({ credit_duree_max: { value: '20 ans', effectiveAt: null, verifiedAt: null } });
  const s = screensOf('logement', f);
  assert.match(textOf('logement', f), /200 000 € sur 20 ans, la durée maximale d’un crédit immobilier/);
  // 20 ans à 3,5 % : environ 78 400 € d'intérêts → 80 000 € (arrondi à 5 000 €)
  assert.equal(s[1].kind === 'reveal' && s[1].value, 280000);
  const sim = s.find((x) => x.kind === 'simulator');
  assert.equal(sim?.kind === 'simulator' && sim.max, 20);
  assert.equal(sim?.kind === 'simulator' && sim.start, 20);
});
