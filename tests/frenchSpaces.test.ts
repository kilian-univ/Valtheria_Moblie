// tests/frenchSpaces.test.ts
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { frenchSpaces } from '@/src/utils/frenchSpaces';

const N = '\u00A0';
const T = '\u202F';
const f = (s: string) => frenchSpaces(s);

test('montants, pourcentages, unités : insécable avant l’unité, fine entre milliers', () => {
  assert.equal(f('Tu as 27 071 € sur ton livret.'), `Tu as 27${T}071${N}€ sur ton livret.`);
  assert.equal(f('Plafond de 1 000 000 €'), `Plafond de 1${T}000${T}000${N}€`);
  assert.equal(f('Taux de 3,5 % par an'), `Taux de 3,5${N}% par an`);
  assert.equal(f('+12 % en un mois'), `+12${N}% en un mois`);
  assert.equal(f('8 ans et 3 mois, 2 hommes'), `8${N}ans et 3${N}mois, 2 hommes`);
  assert.equal(f('À 14 h 30 pile'), `À 14${N}h${N}30 pile`);
  assert.equal(f('il y a 3 min'), `il y a 3${N}min`);
  assert.equal(f('n° 12 du classement'), `n°${N}12 du classement`);
  assert.equal(f('Dans un an : {epargne_montant*12} €'), `Dans un an${N}: {epargne_montant*12}${N}€`);
});

test('ponctuation double et guillemets', () => {
  assert.equal(f('Et toi ?'), `Et toi${T}?`);
  assert.equal(f('Bravo 🎉 !'), `Bravo 🎉${T}!`);
  assert.equal(f('Exemple : un livret'), `Exemple${N}: un livret`);
  assert.equal(f('**Pourquoi ?** Parce que'), `**Pourquoi${T}?** Parce que`);
  assert.equal(f('Le « coussin » de sécurité'), `Le «${N}coussin${N}» de sécurité`);
  assert.equal(f('«Combien garder de côté ?»'), `«${N}Combien garder de côté${T}?${N}»`);
});

test('pièges : rien ne bouge', () => {
  for (const s of [
    'Rendez-vous à 14:30, ratio 1:2',
    'Smiley :) ok',
    'En 2024 100 personnes',
    'Pi vaut 3,141 592',
    'Ouvre ![image](x.png) ici',
    'https://valtheria.fr/a?b=1',
    'contact@valtheria.fr',
    'S&P 500',
    '',
  ]) {
    assert.equal(f(s), s, s);
  }
  // Retours à la ligne gardés ; U+2009 (fine sécable) traitée comme une espace
  assert.equal(f('Ligne 1\nLigne 2 ?'), `Ligne 1\nLigne 2${T}?`);
  assert.equal(f('20\u2009%'), `20${N}%`);
});

test('idempotente, et sans espace fine pour Fraunces', () => {
  const once = f('Tu as 27 071 € ? « Oui » : 3,5 %');
  assert.equal(f(once), once);
  assert.equal(frenchSpaces('1 000 € ?', { thin: false }), `1${N}000${N}€${N}?`);
});

test('déjà insécables : laissées telles quelles', () => {
  const s = `27${T}071${N}€`;
  assert.equal(f(s), s);
});
