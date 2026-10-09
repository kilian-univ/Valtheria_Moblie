/// <reference types="node" />
// Lancer : npm test

import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  decorForCategory,
  categoriesByCount,
  findEntry,
  highlightRange,
  isFavorite,
  isUnauthorized,
  neighbors,
  pickDistractors,
  quizFor,
  shortDefinition,
  toggleFavorite,
  letterSections,
  normalizeEntries,
  normalizeEntry,
  normalizeText,
  pushRecent,
  entriesForTerms,
  sameFamily,
  searchEntries,
  shareMessage,
  suggestions,
  termLetter,
  wordOfTheDay,
  type DictionaryEntry,
  type Quiz,
} from '../src/utils/dictionary';

const RAW = [
  { term: 'Intérêts composés', definition: 'Des intérêts qui rapportent eux-mêmes des intérêts.', category: 'Épargne' },
  { term: 'Inflation', definition: 'Hausse générale des prix.', category: 'Économie' },
  { term: 'Taux d’intérêt', definition: 'Prix de l’argent emprunté.', category: 'Crédit' },
  { term: 'Action', definition: 'Part du capital d’une entreprise.', category: 'Bourse' },
  { term: 'Dividende', definition: 'Part du bénéfice versée aux actionnaires.', category: 'Bourse' },
  { term: 'ETF', definition: 'Fonds qui réplique un indice.', category: 'Bourse' },
  { term: 'Obligation', definition: 'Titre de dette.', category: 'Bourse' },
  { term: 'Épargne de précaution', definition: 'Argent gardé pour les imprévus.', category: 'Épargne' },
  { term: 'Livret A', definition: 'Placement réglementé sans risque, intérêts nets.', category: 'Épargne' },
];
const ENTRIES = normalizeEntries(RAW);
const byTerm = (list: DictionaryEntry[]) => list.map((e) => e.term);

// ---------------------------------------------------------------------------
// Lecture des champs (dont les facultatifs)
// ---------------------------------------------------------------------------
test('mot du serveur actuel : plain et lessons absents → null', () => {
  assert.deepEqual(normalizeEntry({ term: 'ETF', definition: 'Fonds indiciel.', category: 'Bourse' }), {
    term: 'ETF',
    definition: 'Fonds indiciel.',
    category: 'Bourse',
    plain: null,
    lessons: null,
  });
});

test('plain et lessons présents : lus', () => {
  const e = normalizeEntry({
    term: 'ETF',
    definition: 'Fonds indiciel.',
    category: 'Bourse',
    plain: '  Un panier d’actions   en un seul achat. ',
    lessons: [{ id: 12, title: 'Les ETF' }, { id: 0, title: 'invalide' }, { title: 'sans id' }, 'x'],
  });
  assert.equal(e?.plain, 'Un panier d’actions en un seul achat.');
  assert.deepEqual(e?.lessons, [{ id: 12, title: 'Les ETF' }]);
});

test('plain vide, lessons vide ou mal formé → null', () => {
  const e = normalizeEntry({ term: 'ETF', definition: 'D', category: 'B', plain: '  ', lessons: [] });
  assert.equal(e?.plain, null);
  assert.equal(e?.lessons, null);
  assert.equal(normalizeEntry({ term: 'ETF', definition: 'D', category: 'B', lessons: 'Les ETF' })?.lessons, null);
});

test('mot sans terme ou sans définition écarté ; catégorie absente → Autre', () => {
  assert.equal(normalizeEntry({ term: '', definition: 'D' }), null);
  assert.equal(normalizeEntry({ term: 'X' }), null);
  assert.equal(normalizeEntry({ term: 'X', definition: 'D' })?.category, 'Autre');
});

test('liste triée A-Z (accents ignorés), sans doublon, réponse invalide → vide', () => {
  assert.deepEqual(byTerm(normalizeEntries([...RAW, { term: 'action', definition: 'doublon', category: 'Bourse' }])), [
    'Action',
    'Dividende',
    'Épargne de précaution',
    'ETF',
    'Inflation',
    'Intérêts composés',
    'Livret A',
    'Obligation',
    'Taux d’intérêt',
  ]);
  assert.deepEqual(normalizeEntries({ message: 'Unauthenticated.' }), []);
});

// ---------------------------------------------------------------------------
// Recherche
// ---------------------------------------------------------------------------
test('normalisation : accents, casse et espaces en trop ignorés', () => {
  assert.equal(normalizeText('  ÉPARGNE   de  Précaution '), 'epargne de precaution');
  assert.equal(normalizeText('Intérêts'), normalizeText('interets'));
});

test('ordre : commence par, puis contient, puis définition', () => {
  assert.deepEqual(byTerm(searchEntries(ENTRIES, '  INTÉRÊT ')), [
    'Intérêts composés', // commence par
    'Taux d’intérêt', // contient
    'Livret A', // définition
  ]);
});

test('recherche vide : tous les mots ; filtre de catégorie appliqué aussi pendant la recherche', () => {
  assert.equal(searchEntries(ENTRIES, '   ').length, ENTRIES.length);
  assert.deepEqual(byTerm(searchEntries(ENTRIES, 'interet', 'Épargne')), ['Intérêts composés', 'Livret A']);
  assert.deepEqual(byTerm(searchEntries(ENTRIES, '', 'Crédit')), ['Taux d’intérêt']);
});

test('surlignage : indices dans le terme d’origine, accents compris', () => {
  assert.deepEqual(highlightRange('Taux d’intérêt', 'interet'), { start: 7, end: 14 });
  assert.deepEqual(highlightRange('Épargne', 'EP'), { start: 0, end: 2 });
  assert.equal(highlightRange('ETF', 'action'), null);
  assert.equal(highlightRange('ETF', '  '), null);
});

test('sections A-Z : lettre sans accent, chiffres et signes en #', () => {
  assert.equal(termLetter('Épargne'), 'E');
  assert.equal(termLetter('401k'), '#');
  const sections = letterSections(ENTRIES);
  assert.deepEqual(
    sections.map((s) => s.title),
    ['A', 'D', 'E', 'I', 'L', 'O', 'T']
  );
  assert.deepEqual(byTerm(sections[2].data), ['Épargne de précaution', 'ETF']);
});

test('catégories triées par nombre de mots', () => {
  assert.deepEqual(
    categoriesByCount(ENTRIES).map((c) => c.name),
    ['Bourse', 'Épargne', 'Crédit', 'Économie']
  );
});

test('fiche retrouvée par son terme, accents et casse ignorés', () => {
  assert.equal(findEntry(ENTRIES, 'taux d’INTERET')?.term, 'Taux d’intérêt');
  assert.equal(findEntry(ENTRIES, 'inconnu'), null);
  assert.equal(findEntry(ENTRIES, undefined), null);
});

// ---------------------------------------------------------------------------
// Mot du jour
// ---------------------------------------------------------------------------
test('mot du jour : le même toute la journée, quel que soit l’ordre reçu', () => {
  const morning = new Date(2026, 9, 10, 0, 1);
  const evening = new Date(2026, 9, 10, 23, 59);
  const word = wordOfTheDay(ENTRIES, morning);
  assert.ok(word);
  assert.equal(wordOfTheDay(ENTRIES, evening), word);
  assert.equal(wordOfTheDay([...ENTRIES].reverse(), morning)?.term, word.term);
});

test('mot du jour : change d’un jour à l’autre (sur une semaine), liste vide → null', () => {
  const week = Array.from({ length: 7 }, (_, i) => wordOfTheDay(ENTRIES, new Date(2026, 9, 10 + i))?.term);
  assert.ok(new Set(week).size > 1);
  assert.equal(wordOfTheDay([], new Date()), null);
});

// ---------------------------------------------------------------------------
// Suggestions de frappe
// ---------------------------------------------------------------------------
test('suggestions : distance de 2 au plus, sans accents, les plus proches d’abord', () => {
  assert.deepEqual(byTerm(suggestions(ENTRIES, 'inflaton')), ['Inflation']);
  assert.deepEqual(byTerm(suggestions(ENTRIES, 'divdende')), ['Dividende']);
  assert.deepEqual(byTerm(suggestions(ENTRIES, 'ETFS')), ['ETF']);
  assert.deepEqual(suggestions(ENTRIES, 'zzzzzz'), []);
  assert.ok(suggestions(ENTRIES, 'a').length === 0, 'une seule lettre : pas de suggestion');
});

test('suggestions : 2 au plus', () => {
  const close = normalizeEntries([
    { term: 'Taux', definition: 'D', category: 'C' },
    { term: 'Taxe', definition: 'D', category: 'C' },
    { term: 'Tau', definition: 'D', category: 'C' },
  ]);
  assert.equal(suggestions(close, 'tax').length, 2);
});

// ---------------------------------------------------------------------------
// Même famille
// ---------------------------------------------------------------------------
test('même famille : 3 autres mots de la catégorie, sans le mot lui-même', () => {
  const action = findEntry(ENTRIES, 'Action')!;
  assert.deepEqual(byTerm(sameFamily(ENTRIES, action)), ['Dividende', 'ETF', 'Obligation']);
  const obligation = findEntry(ENTRIES, 'Obligation')!;
  // En fin de liste : on repart du début
  assert.deepEqual(byTerm(sameFamily(ENTRIES, obligation)), ['Action', 'Dividende', 'ETF']);
  assert.deepEqual(sameFamily(ENTRIES, findEntry(ENTRIES, 'Inflation')!), []);
});

// ---------------------------------------------------------------------------
// Récents
// ---------------------------------------------------------------------------
test('récents : en tête, 3 au plus, sans doublon', () => {
  let r: string[] = [];
  for (const t of ['ETF', 'Action', 'Inflation', 'Dividende']) r = pushRecent(r, t);
  assert.deepEqual(r, ['Dividende', 'Inflation', 'Action']);
  assert.deepEqual(pushRecent(r, 'inflation'), ['inflation', 'Dividende', 'Action']);
});

test('récents disparus du dictionnaire ignorés', () => {
  assert.deepEqual(byTerm(entriesForTerms(ENTRIES, ['ETF', 'Mot supprimé', 'action'])), ['ETF', 'Action']);
});

// ---------------------------------------------------------------------------
// Divers
// ---------------------------------------------------------------------------
test('partage : « <Mot> : <définition> (Valtheria) »', () => {
  assert.equal(shareMessage(findEntry(ENTRIES, 'ETF')!), 'ETF : Fonds qui réplique un indice. (Valtheria)');
});

test('401 reconnu depuis le message d’ApiContext', () => {
  assert.equal(isUnauthorized(new Error('Unauthenticated.')), true);
  assert.equal(isUnauthorized(new Error('Erreur API')), false);
  assert.equal(isUnauthorized(new TypeError('Network request failed')), false);
});

// ---------------------------------------------------------------------------
// Teste-toi
// ---------------------------------------------------------------------------
const DAY = new Date(2026, 9, 10, 9, 0);
const SAME_DAY = new Date(2026, 9, 10, 22, 30);

function checkQuiz(q: Quiz | null) {
  assert.ok(q);
  assert.equal(q.answers.length, 3);
  assert.equal(q.answers.filter((a) => a.correct).length, 1);
  assert.equal(q.answers.find((a) => a.correct)?.label, q.correctLabel);
  assert.equal(new Set(q.answers.map((a) => normalizeText(a.label))).size, 3, 'trois réponses distinctes');
  return q;
}

test('question stable : même mot, même jour → même question, même ordre des réponses', () => {
  for (const entry of ENTRIES) {
    const a = quizFor(ENTRIES, entry, DAY);
    assert.deepEqual(quizFor(ENTRIES, entry, SAME_DAY), a);
    assert.deepEqual(quizFor([...ENTRIES].reverse(), entry, DAY)?.question, a?.question);
    checkQuiz(a);
  }
});

test('« Une autre question » : un autre tirage, toujours valide', () => {
  const action = findEntry(ENTRIES, 'Action')!;
  const rounds = Array.from({ length: 8 }, (_, r) => checkQuiz(quizFor(ENTRIES, action, DAY, r)));
  assert.ok(new Set(rounds.map((q) => JSON.stringify(q))).size > 1);
  // Les deux types de question finissent par sortir
  assert.deepEqual(new Set(rounds.map((q) => q.kind)), new Set(['term', 'definition']));
});

test('« Quel mot… ? » : définition d’un AUTRE mot de la même catégorie', () => {
  const action = findEntry(ENTRIES, 'Action')!;
  for (let r = 0; r < 20; r++) {
    const q = quizFor(ENTRIES, action, DAY, r)!;
    if (q.kind !== 'term') continue;
    const target = findEntry(ENTRIES, q.correctLabel)!;
    assert.notEqual(target.term, 'Action');
    assert.equal(target.category, 'Bourse');
    assert.equal(q.quote, target.definition);
    assert.equal(q.question, 'Quel mot correspond à cette définition ?');
  }
});

test('« Que veut dire… ? » : la bonne définition, courte', () => {
  const action = findEntry(ENTRIES, 'Action')!;
  for (let r = 0; r < 20; r++) {
    const q = quizFor(ENTRIES, action, DAY, r)!;
    if (q.kind !== 'definition') continue;
    assert.equal(q.question, 'Que veut dire Action ?');
    assert.equal(q.correctLabel, shortDefinition(action.definition));
    assert.equal(q.quote, null);
  }
});

test('mot seul dans sa catégorie : « Que veut dire… ? », mauvaises réponses prises ailleurs', () => {
  const inflation = findEntry(ENTRIES, 'Inflation')!; // seul mot d’Économie
  for (let r = 0; r < 10; r++) assert.equal(checkQuiz(quizFor(ENTRIES, inflation, DAY, r)).kind, 'definition');
});

test('mauvaises réponses : même catégorie d’abord, puis tout le dictionnaire', () => {
  const random = () => 0.42;
  const same = pickDistractors(ENTRIES, 'Bourse', ['Action'], 2, random);
  assert.ok(same.every((e) => e.category === 'Bourse' && e.term !== 'Action'));
  // Crédit n’a qu’un mot, exclu : on complète ailleurs
  const filled = pickDistractors(ENTRIES, 'Crédit', ['Taux d’intérêt'], 2, random);
  assert.equal(filled.length, 2);
  assert.ok(filled.every((e) => e.term !== 'Taux d’intérêt'));
  // Épargne a 3 mots : 2 viennent de la catégorie
  const epargne = pickDistractors(ENTRIES, 'Épargne', ['Livret A'], 2, random);
  assert.ok(epargne.every((e) => e.category === 'Épargne'));
});

test('mauvaises réponses : jamais deux fois la même définition', () => {
  const twins = normalizeEntries([
    { term: 'A1', definition: 'Même texte.', category: 'X' },
    { term: 'A2', definition: 'Même texte.', category: 'X' },
    { term: 'B', definition: 'Autre texte.', category: 'X' },
    { term: 'C', definition: 'Encore un.', category: 'Y' },
  ]);
  const wrong = pickDistractors(twins, 'X', ['B'], 2, () => 0.1, (e) => e.definition);
  assert.equal(new Set(wrong.map((e) => e.definition)).size, 2);
});

test('moins de 3 mots : pas de question', () => {
  const two = ENTRIES.slice(0, 2);
  assert.equal(quizFor(two, two[0], DAY), null);
});

test('définition courte : première phrase, 110 caractères au plus', () => {
  assert.equal(shortDefinition('Hausse des prix. Elle réduit le pouvoir d’achat.'), 'Hausse des prix.');
  const long = shortDefinition('mot '.repeat(60).trim());
  assert.ok(long.length <= 110 && long.endsWith('…'));
});

// ---------------------------------------------------------------------------
// Mes mots
// ---------------------------------------------------------------------------
test('mes mots : ajout en tête, retrait, sans doublon', () => {
  let fav: string[] = [];
  fav = toggleFavorite(fav, 'ETF');
  fav = toggleFavorite(fav, 'Action');
  assert.deepEqual(fav, ['Action', 'ETF']);
  assert.equal(isFavorite(fav, 'etf'), true);
  fav = toggleFavorite(fav, 'etf'); // retrait, accents et casse ignorés
  assert.deepEqual(fav, ['Action']);
  assert.equal(isFavorite(fav, 'ETF'), false);
  fav = toggleFavorite(toggleFavorite(fav, 'Inflation'), 'Inflation');
  assert.deepEqual(fav, ['Action']);
});

// ---------------------------------------------------------------------------
// Précédent et suivant
// ---------------------------------------------------------------------------
test('précédent et suivant : ordre A-Z, null aux bornes', () => {
  const first = neighbors(ENTRIES, findEntry(ENTRIES, 'Action')!);
  assert.equal(first.previous, null);
  assert.equal(first.next?.term, 'Dividende');
  const last = neighbors(ENTRIES, findEntry(ENTRIES, 'Taux d’intérêt')!);
  assert.equal(last.previous?.term, 'Obligation');
  assert.equal(last.next, null);
  const mid = neighbors(ENTRIES, findEntry(ENTRIES, 'ETF')!);
  assert.deepEqual([mid.previous?.term, mid.next?.term], ['Épargne de précaution', 'Inflation']);
});

test('précédent et suivant avec filtre : dans la catégorie seulement', () => {
  const etf = neighbors(ENTRIES, findEntry(ENTRIES, 'ETF')!, 'Bourse');
  assert.deepEqual([etf.previous?.term, etf.next?.term], ['Dividende', 'Obligation']);
  const obligation = neighbors(ENTRIES, findEntry(ENTRIES, 'Obligation')!, 'Bourse');
  assert.equal(obligation.next, null, 'dernier de la catégorie');
  // Mot hors de la catégorie filtrée : tout le dictionnaire
  const inflation = neighbors(ENTRIES, findEntry(ENTRIES, 'Inflation')!, 'Bourse');
  assert.deepEqual([inflation.previous?.term, inflation.next?.term], ['ETF', 'Intérêts composés']);
});

// ---------------------------------------------------------------------------
// Illustration
// ---------------------------------------------------------------------------
test('décor selon la catégorie, accents et casse ignorés, pile de pièces par défaut', () => {
  assert.equal(decorForCategory('Bourse'), 'graphique');
  assert.equal(decorForCategory('ÉPARGNE'), 'tirelire');
  assert.equal(decorForCategory('Crédit'), 'cle');
  assert.equal(decorForCategory('Impôts'), 'carnet');
  assert.equal(decorForCategory('Économie'), 'pile-pieces');
  assert.equal(decorForCategory('constructor'), 'pile-pieces');
});
