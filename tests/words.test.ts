/// <reference types="node" />
// Lancer : npm test
// Dictionnaire : test sur le mot de la page, états des mots, index mots ↔
// leçons, mots dans la révision

import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  findEntry,
  normalizeEntries,
  relatedWords,
  revealsSubject,
  wordQuestion,
  wordQuestionFormats,
  wordQuestionScreen,
  wordTest,
} from '../src/utils/dictionary';
import { normalizeLesson } from '../src/lesson/normalize';
import { buildCandidates, pickServerExtras, revisionLesson, termOfKey, wordItemKey } from '../src/utils/revision';
import { revisionWords } from '../src/utils/revisionWords';
import { buildWordIndex, indexSignature, lessonsOfWord, lessonText, wordMatcher, wordsInSameLessons } from '../src/utils/wordLessonIndex';
import {
  dueWords,
  markResult,
  markSeen,
  matchesFilter,
  mergeWords,
  migrateDiscovered,
  wordCounts,
  wordCountsLabel,
  wordState,
} from '../src/utils/wordStates';

const WORDS = normalizeEntries([
  { term: 'Action', definition: 'Titre de propriété d’une part du capital d’une entreprise cotée.', category: 'Bourse' },
  { term: 'Obligation', definition: 'Titre de dette émis par une entreprise ou un État, qui verse des intérêts.', category: 'Bourse' },
  { term: 'Dividende', definition: 'Part du bénéfice d’une entreprise versée à ses actionnaires.', category: 'Bourse' },
  { term: 'Indice boursier', definition: 'Panier de valeurs qui mesure l’évolution d’un marché.', category: 'Bourse' },
  { term: 'Krach', definition: 'Chute brutale et rapide des cours.', category: 'Bourse' },
  { term: 'PEA', definition: 'Plan d’épargne en actions — enveloppe fiscale pour investir en actions européennes.', category: 'Fiscalité' },
  { term: 'IR', definition: 'Impôt sur le revenu — impôt payé chaque année sur ce que l’on gagne.', category: 'Fiscalité' },
  { term: 'IS', definition: 'Impôt sur les sociétés — impôt payé par les entreprises sur leurs bénéfices.', category: 'Fiscalité' },
  { term: 'Inflation', definition: 'Hausse générale et durable des prix.', category: 'Économie' },
  { term: 'Taux directeur', definition: 'Taux fixé par une banque centrale pour prêter aux banques.', category: 'Économie' },
]);
const get = (t: string) => findEntry(WORDS, t)!;
const fixed = () => 0.37;

// ---------------------------------------------------------------------------
// Formats de question
// ---------------------------------------------------------------------------

test('formats selon les champs : définition pour un mot, développé pour un sigle, mot à retrouver pour tous', () => {
  assert.deepEqual(wordQuestionFormats(WORDS, get('Dividende')), ['definition', 'term']);
  assert.deepEqual(wordQuestionFormats(WORDS, get('PEA')), ['expansion', 'term']);
  // Un sigle n'a jamais « Que veut dire … ? » (le développé trahirait la réponse)
  assert.equal(wordQuestion(WORDS, get('PEA'), 'definition', fixed), null);
  // Dictionnaire trop petit : rien
  assert.deepEqual(wordTest(WORDS.slice(0, 2), get('Action'), 1), []);
});

test('développé d’un sigle parmi 3 : les autres sont des développés d’autres sigles', () => {
  const q = wordQuestion(WORDS, get('PEA'), 'expansion', fixed)!;
  assert.equal(q.question, 'Que signifie PEA ?');
  assert.equal(q.correctLabel, 'Plan d’épargne en actions');
  assert.equal(q.answers.length, 3);
  assert.deepEqual(new Set(q.answers.map((a) => a.label)), new Set(['Plan d’épargne en actions', 'Impôt sur le revenu', 'Impôt sur les sociétés']));
  assert.equal(q.answers.filter((a) => a.correct).length, 1);
});

test('jamais de réponse visible : définition masquée, réponses sans le mot ni sa racine', () => {
  for (let seed = 0; seed < 20; seed++) {
    for (const entry of WORDS) {
      for (const q of wordTest(WORDS, entry, seed)) {
        assert.equal(q.answers.filter((a) => a.correct).length, 1);
        assert.equal(new Set(q.answers.map((a) => a.label)).size, 3, 'trois réponses différentes');
        if (q.format === 'term') {
          // La définition affichée ne contient ni le mot, ni son sigle, ni sa racine
          assert.ok(!revealsSubject(q.question, entry), `${entry.term} : ${q.question}`);
          assert.ok(!q.ask.includes(entry.term));
        }
        if (q.format === 'definition') {
          for (const a of q.answers) assert.ok(!revealsSubject(a.label, entry), `${entry.term} : ${a.label}`);
        }
      }
    }
  }
});

test('le test : une question pour un mot, deux pour un sigle, la définition seulement à la fin', () => {
  const word = wordTest(WORDS, get('Obligation'), 3);
  assert.equal(word.length, 1, 'ses deux formats reposent sur la même définition');
  assert.equal(word[0].format, 'definition');
  assert.ok(word[0].explanation?.startsWith('Obligation : '));
  const sigle = wordTest(WORDS, get('PEA'), 3);
  assert.deepEqual(sigle.map((q) => q.format), ['expansion', 'term']);
  assert.equal(sigle[0].explanation, null, 'la définition donnerait la réponse de la question suivante');
  assert.ok(sigle[1].explanation?.startsWith('PEA : '));
  // Joué dans le lecteur : choix noté
  const lesson = normalizeLesson({ screens: sigle.map(wordQuestionScreen) });
  assert.ok(lesson.screens.every((s) => s.kind === 'choice' && s.scored));
  // Le même tirage pour la même graine
  assert.deepEqual(wordTest(WORDS, get('PEA'), 3), sigle);
});

test('« Un autre mot ? » : mêmes leçons et même catégorie, pas encore vus d’abord', () => {
  const seen = new Set(['Obligation']);
  const out = relatedWords(WORDS, get('Action'), (t) => seen.has(t), () => ['Inflation']);
  assert.equal(out.length, 2);
  assert.ok(!out.some((e) => e.term === 'Action'));
  assert.equal(out[0].term, 'Inflation', 'même leçon et pas encore vu');
  assert.ok(!out.some((e) => e.term === 'Obligation') || out.length < 2);
});

// ---------------------------------------------------------------------------
// États des mots
// ---------------------------------------------------------------------------

test('états : pas encore vu → vu → maîtrisé ; un maîtrisé raté redevient vu', () => {
  const t0 = new Date('2026-10-01T10:00:00');
  let m = {};
  assert.equal(wordState(m, 'Krach'), 'nouveau');
  m = markSeen(m, 'Krach', t0);
  assert.equal(wordState(m, 'krach'), 'vu', 'accents et casse ignorés');
  assert.equal(markSeen(m, 'Krach', new Date('2026-10-05')), m, 'déjà vu : rien ne change');
  m = markResult(m, 'Krach', true, new Date('2026-10-02T10:00:00'));
  assert.equal(wordState(m, 'Krach'), 'maitrise');
  m = markResult(m, 'Krach', false, new Date('2026-10-09T10:00:00'));
  assert.equal(wordState(m, 'Krach'), 'vu');
  // Un test raté sur un mot pas encore vu le rend vu
  assert.equal(wordState(markResult({}, 'IR', false, t0), 'IR'), 'vu');
});

test('filtre, compteurs, reprise des anciens mots découverts et de la mémoire sans compte', () => {
  let m = markSeen({}, 'Krach', new Date('2026-10-01'));
  m = markResult(markSeen(m, 'PEA', new Date('2026-10-01')), 'PEA', true, new Date('2026-10-02'));
  assert.equal(matchesFilter(wordState(m, 'Action'), 'nouveaux'), true);
  assert.equal(matchesFilter(wordState(m, 'Krach'), 'vus'), true);
  assert.equal(matchesFilter(wordState(m, 'PEA'), 'vus'), false);
  assert.equal(matchesFilter(wordState(m, 'PEA'), 'maitrises'), true);
  assert.deepEqual(wordCounts(m, ['Krach', 'PEA', 'Action']), { seen: 2, mastered: 1 });
  assert.deepEqual(wordCounts(m, ['Krach']), { seen: 1, mastered: 0 }, 'un mot retiré du dictionnaire ne compte plus');
  assert.equal(wordCountsLabel({ seen: 12, mastered: 4 }), '12 vus · 4 maîtrisés');
  assert.equal(wordCountsLabel({ seen: 1, mastered: 0 }), '1 vu · 0 maîtrisé');
  const migrated = migrateDiscovered({}, ['Inflation']);
  assert.equal(wordState(migrated, 'Inflation'), 'vu');
  const merged = mergeWords(markSeen({}, 'Krach', new Date('2026-10-05')), markSeen({}, 'Krach', new Date('2026-10-01')));
  assert.equal(merged.krach.seenAt, new Date('2026-10-01').toISOString(), 'la plus ancienne ouverture');
});

// ---------------------------------------------------------------------------
// Index mots ↔ leçons
// ---------------------------------------------------------------------------

test('index : accents et casse ignorés, mots entiers, pluriel accepté', () => {
  const lessons = [
    { lessonId: 1, title: 'Les taux directeurs', text: 'Quand la BCE monte ses TAUX DIRECTEURS…' },
    { lessonId: 2, title: 'Ton PEA', text: 'Le pea, c’est plat.\nUn krach peut arriver.' },
    { lessonId: 3, title: 'Supprimer ses frais', text: 'La dividende est versée. Les obligations aussi.' },
  ];
  const index = buildWordIndex(['Taux directeur', 'PEA', 'Krach', 'Dividende', 'Obligation', 'Prime'], lessons);
  assert.deepEqual(lessonsOfWord(index, 'Taux directeur'), [1]);
  assert.deepEqual(lessonsOfWord(index, 'PEA'), [2], 'sigle trouvé en majuscules seulement');
  assert.deepEqual(lessonsOfWord(index, 'krach'), [2]);
  assert.deepEqual(lessonsOfWord(index, 'Obligation'), [3], 'pluriel');
  assert.deepEqual(lessonsOfWord(index, 'Prime'), [], '« prime » n’est pas dans « supprimer »');
  assert.deepEqual(wordsInSameLessons(index, 'Krach', ['PEA', 'Krach', 'Dividende']), ['PEA']);
});

test('index : faux positifs évités sur les mots trop courts ou trop courants', () => {
  assert.equal(wordMatcher('Action'), null, 'mot trop courant');
  assert.equal(wordMatcher('Marché'), null);
  assert.equal(wordMatcher('Bail'), null, 'mot seul trop court');
  assert.ok(wordMatcher('IS'), 'sigle gardé…');
  const is = wordMatcher('IS')!;
  assert.equal(is('Ce IS est payé', 'ce is est paye'), true);
  assert.equal(is('This is it', 'this is it'), false, '… mais jamais en minuscules');
  assert.equal(is('ISIN du titre', 'isin du titre'), false, 'mot entier');
  assert.ok(wordMatcher('Plus-value'), 'expression composée gardée');
});

test('index : textes d’une leçon telle que servie, signature qui change avec les leçons', () => {
  const text = lessonText({
    title: 'Le coussin',
    screens: [{ type: 'choice', payload: { question: 'Combien garder ?', options: [{ id: 'a', text: 'Trois mois' }] }, explanation: 'Une épargne de précaution.' }],
  });
  assert.ok(text.includes('Combien garder ?') && text.includes('Trois mois') && text.includes('épargne de précaution'));
  assert.ok(!/\bchoice\b/.test(text), 'pas de noms techniques');
  const a = indexSignature(['A'], [{ lessonId: 1, title: 'L', text: 'x' }]);
  assert.equal(a, indexSignature(['A'], [{ lessonId: 1, title: 'L', text: 'x' }]));
  assert.notEqual(a, indexSignature(['A'], [{ lessonId: 1, title: 'L', text: 'xy' }]));
  assert.notEqual(a, indexSignature(['A', 'B'], [{ lessonId: 1, title: 'L', text: 'x' }]));
});

// ---------------------------------------------------------------------------
// Mots dans la révision
// ---------------------------------------------------------------------------

test('révision : vu depuis 2 jours, raté depuis la veille, maîtrisé après 7 puis 21 jours, jamais pas encore vu', () => {
  const day = (s: string) => new Date(`${s}T10:00:00`);
  let m = {};
  m = markSeen(m, 'Krach', day('2026-10-10'));
  m = markSeen(m, 'Inflation', day('2026-10-11'));
  m = markResult(markSeen(m, 'PEA', day('2026-10-01')), 'PEA', false, day('2026-10-11'));
  m = markResult(markSeen(m, 'IR', day('2026-10-01')), 'IR', true, day('2026-10-05'));
  const terms = WORDS.map((e) => e.term);
  // Le 12 : Krach vu il y a 2 jours ; PEA raté la veille ; Inflation vue hier : pas encore ; IR maîtrisé il y a 7 jours
  assert.deepEqual(dueWords(m, terms, '2026-10-12').map((w) => w.term), ['PEA', 'IR', 'Krach']);
  assert.equal(dueWords(m, terms, '2026-10-11').some((w) => w.term === 'IR'), false, 'maîtrisé depuis 6 jours');
  // Révision réussie d'un maîtrisé : prochain retour 21 jours plus tard
  const later = markResult(m, 'IR', true, day('2026-10-12'));
  assert.equal(dueWords(later, terms, '2026-10-30').some((w) => w.term === 'IR'), false);
  assert.equal(dueWords(later, terms, '2026-11-02').some((w) => w.term === 'IR'), true);
  // Jamais un mot pas encore vu, ni un mot retiré du dictionnaire
  assert.equal(dueWords(m, terms, '2026-12-01').some((w) => w.term === 'Action'), false);
  assert.deepEqual(dueWords(m, ['Krach'], '2026-12-01').map((w) => w.term), ['Krach']);
});

test('révision de l’app : les mots dus font partie de la matière, avec leur question', () => {
  const m = markSeen({}, 'Dividende', new Date('2026-10-01T10:00:00'));
  const words = revisionWords(m, WORDS, '2026-10-12', 1);
  assert.equal(words.length, 1);
  const candidates = buildCandidates({ lessons: [], declics: [], history: {}, lessonDoneAt: () => null, random: fixed, words });
  assert.equal(candidates[0].key, wordItemKey('Dividende'));
  assert.equal(termOfKey(candidates[0].key), 'Dividende');
  const built = revisionLesson(candidates.map((c) => c.item), []);
  assert.equal(normalizeLesson({ screens: built.screens }).screens[0].kind, 'choice');
  assert.equal(revisionWords({}, WORDS, '2026-10-12', 1).length, 0, 'aucun mot vu : aucun mot');
});

test('révision du serveur : 2 mots et 2 déclics au plus, 3 ajouts en tout', () => {
  let m = {};
  for (const t of ['Krach', 'Dividende', 'Inflation']) m = markSeen(m, t, new Date('2026-10-01T10:00:00'));
  const words = revisionWords(m, WORDS, '2026-10-12', 1);
  assert.equal(words.length, 3);
  const declics = ['Le [temps] compte', 'Le [risque] se paie', 'La [diversification] protège'].map((text) => ({
    text,
    universeSlug: null,
    universeName: null,
    lessonTitle: null,
    at: '2026-10-01T00:00:00Z',
  }));
  const extras = pickServerExtras({ declics, words, history: {}, yesterdayKeys: [], random: fixed });
  assert.equal(extras.length, 3);
  assert.ok(extras.filter((e) => e.kind === 'word').length <= 2);
  assert.ok(extras.filter((e) => e.kind === 'declic').length <= 2);
  assert.equal(pickServerExtras({ declics: [], words, history: {}, yesterdayKeys: [], random: fixed }).length, 2, 'sans déclic : 2 mots');
});
