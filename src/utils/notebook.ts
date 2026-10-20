// Carnet de déclics et test « Me tester sur mes déclics », sans React :
// testables avec Node. La mémoire elle-même est dans state/notebook.ts.
//
// Un déclic est la phrase « À retenir » d'une leçon terminée. Ses mots clés
// sont marqués entre crochets dans les données (« Le [temps] fait plus que
// le montant ») ; ils servent au test (mot masqué) et disparaissent partout
// ailleurs.

import type { Module } from '@/src/context/ApiContext';
import type { Universe } from '@/src/lesson/model';
import { universeOfModule } from './modulePath';

export type Declic = {
  // Phrase telle que dans les données, crochets compris
  text: string;
  universeSlug: string | null;
  universeName: string | null;
  lessonTitle: string | null;
  // Date d'ajout (ISO)
  at: string;
};

// Déclic d'une leçon du serveur terminée : son univers retrouvé par son
// module ; sans phrase « À retenir », rien
export function declicForLesson(
  lessonId: number,
  marked: string | null,
  lessonTitle: string | null,
  modules: readonly Module[],
  universes: Universe[],
  at: string
): Declic | null {
  if (!marked || !marked.trim()) return null;
  const module = modules.find((m) => (m.lessons ?? []).some((l) => l.id === lessonId));
  const universe = module ? universeOfModule(module, universes) : null;
  return {
    text: marked.trim(),
    universeSlug: universe?.slug ?? null,
    universeName: universe?.name ?? null,
    lessonTitle,
    at,
  };
}

// Phrase affichée : sans les crochets
export function plainDeclic(text: string): string {
  return text.replace(/\[([^\]]*)\]/g, '$1').replace(/[^\S\u00A0\u202F]+/g, ' ').trim();
}

// Mots clés marqués
export function declicKeywords(text: string): string[] {
  return [...text.matchAll(/\[([^\]]+)\]/g)].map((m) => m[1].trim()).filter(Boolean);
}

// Comparaison sans casse, accents ni ponctuation finale
function normalize(text: string): string {
  return plainDeclic(text)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’‘]/g, "'")
    .replace(/[.\s]+$/g, '')
    .toLowerCase();
}

export function sameDeclic(a: string, b: string): boolean {
  return normalize(a) === normalize(b);
}

// Ajout unique : une phrase déjà au carnet n'y entre pas une seconde fois
// (leçon rejouée). Le plus récent en tête.
export function addDeclic(list: readonly Declic[], entry: Declic): Declic[] {
  if (!entry.text.trim() || list.some((d) => sameDeclic(d.text, entry.text))) return [...list];
  return [entry, ...list];
}

// Fusion d'un carnet dans un autre (carnet sans compte repris par le
// compte) : sans doublon, du plus récent au plus ancien
export function mergeDeclics(base: readonly Declic[], extra: readonly Declic[]): Declic[] {
  let out = [...base];
  for (const d of extra) out = addDeclic(out, d);
  return sortRecent(out);
}

function sortRecent(list: Declic[]): Declic[] {
  return [...list].sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
}

export type DeclicGroup = { slug: string | null; name: string | null; items: Declic[] };

// Écran « Mon carnet » : groupés par univers ; les groupes et les déclics du
// plus récent au plus ancien
export function groupByUniverse(list: readonly Declic[]): DeclicGroup[] {
  const groups: DeclicGroup[] = [];
  for (const d of sortRecent([...list])) {
    const key = d.universeSlug ?? null;
    let group = groups.find((g) => g.slug === key);
    if (!group) {
      group = { slug: key, name: d.universeName, items: [] };
      groups.push(group);
    }
    group.items.push(d);
  }
  return groups;
}

// ---------------------------------------------------------------------------
// Test
// ---------------------------------------------------------------------------

export const QUIZ_MAX = 5;
export const BLANK = '_____';

// Mots proches, quand le carnet ne fournit pas assez d'autres mots clés
export const NEAR_WORDS = [
  'temps',
  'montant',
  'valeur',
  'risque',
  'épargne',
  'inflation',
  'intérêt',
  'crédit',
  'durée',
  'impôt',
  'salaire',
  'budget',
  'revenu',
  'prix',
  'seuil',
] as const;

// Mots trop courants pour servir de mot clé (déclic venu du serveur, sans
// crochets)
const STOP = new Set([
  'avec', 'dans', 'pour', 'plus', 'moins', 'sans', 'sous', 'entre', 'chaque', 'toujours', 'jamais',
  'cette', 'leurs', 'notre', 'votre', 'quand', 'comme', 'aussi', 'encore', 'peuvent', 'peut', 'fait',
  'font', 'être', 'avoir', 'tout', 'tous', 'toute', 'toutes', 'bien', 'très', 'parce', 'alors',
]);

// Mot clé d'un déclic sans crochets : le mot le plus long, hors mots courants
function guessKeyword(text: string): string | null {
  const words = plainDeclic(text)
    .split(/[\s,;:.!?«»()’'"]+/)
    .filter((w) => /^\p{L}{5,}$/u.test(w) && !STOP.has(w.toLowerCase()));
  if (words.length === 0) return null;
  return words.reduce((a, b) => (b.length > a.length ? b : a));
}

export type QuizQuestion = {
  // Phrase avec le mot masqué (BLANK)
  prompt: string;
  answer: string;
  // Trois choix, sans doublon, dans un ordre mélangé
  choices: string[];
  // Phrase complète et sa leçon, montrées après la réponse
  full: string;
  lessonTitle: string | null;
};

const key = (w: string) => w.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function shuffle<T>(list: T[], random: () => number): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// Remplace la première occurrence du mot clé (crochets compris) par le blanc
function blankOut(text: string, keyword: string): string {
  const marked = `[${keyword}]`;
  if (text.includes(marked)) return plainDeclic(text.replace(marked, BLANK));
  const plain = plainDeclic(text);
  const i = plain.indexOf(keyword);
  return i < 0 ? plain : `${plain.slice(0, i)}${BLANK}${plain.slice(i + keyword.length)}`;
}

type Usable = { d: Declic; keywords: string[] };

function usableDeclics(list: readonly Declic[]): Usable[] {
  return list
    .map((d) => {
      const marked = declicKeywords(d.text);
      const keywords = marked.length > 0 ? marked : [guessKeyword(d.text)].filter((w): w is string => !!w);
      return { d, keywords };
    })
    .filter((x) => x.keywords.length > 0);
}

// Une question : le déclic avec un mot clé masqué et trois choix : le bon
// mot, et deux mots clés d'autres déclics du carnet ou des mots proches,
// jamais deux fois le même mot
function questionFrom({ d, keywords }: Usable, allKeywords: string[], random: () => number): QuizQuestion {
  const answer = keywords[Math.floor(random() * keywords.length)];
  const taken = new Set([key(answer), ...keywords.map(key)]);
  const others: string[] = [];
  const candidates = [...shuffle(allKeywords, random), ...shuffle([...NEAR_WORDS], random)];
  for (const w of candidates) {
    if (others.length === 2) break;
    if (taken.has(key(w))) continue;
    taken.add(key(w));
    others.push(w);
  }
  return {
    prompt: blankOut(d.text, answer),
    answer,
    choices: shuffle([answer, ...others], random),
    full: plainDeclic(d.text),
    lessonTitle: d.lessonTitle,
  };
}

// Questions du test : QUIZ_MAX au plus (moins si le carnet en a moins),
// chacune un déclic différent
export function buildQuiz(list: readonly Declic[], random: () => number = Math.random): QuizQuestion[] {
  const usable = usableDeclics(list);
  const allKeywords = usable.flatMap((x) => x.keywords);
  return shuffle(usable, random)
    .slice(0, QUIZ_MAX)
    .map((u) => questionFrom(u, allKeywords, random));
}

// Question d'un déclic donné (révision quotidienne), les autres mots venant
// du carnet entier ; null si la phrase n'a aucun mot clé utilisable
export function quizQuestionFor(declic: Declic, all: readonly Declic[], random: () => number = Math.random): QuizQuestion | null {
  const [own] = usableDeclics([declic]);
  if (!own) return null;
  return questionFrom(own, usableDeclics(all).flatMap((x) => x.keywords), random);
}

// Un écran du test, au format d'une leçon du serveur (choix unique)
export function quizScreen(q: QuizQuestion, i: number): unknown {
  return {
    type: 'choice',
    scored: true,
    val: {
      intro: { line: i === 0 ? 'Un mot manque. Lequel ?' : 'Et celui-ci ?', mood: 'complice' },
      correct: { line: 'Tu l’as gardé en tête.', mood: 'fier' },
      wrong: { line: 'Il revient vite, tu vas voir.', mood: 'rassurant' },
    },
    explanation: q.lessonTitle ? `« ${q.full} » (${q.lessonTitle})` : `« ${q.full} »`,
    payload: {
      question: q.prompt,
      mode: 'single',
      options: q.choices.map((c, j) => ({ id: `c${j}`, text: c, ...(c === q.answer ? { correct: true } : {}) })),
    },
  };
}

// Le test au format d'une leçon du serveur (GET /lessons/{id}) : il passe par
// normalizeLesson et se joue dans le lecteur des leçons
export function quizLesson(questions: readonly QuizQuestion[]): unknown {
  return {
    title: 'Mes déclics',
    takeaway: null,
    screens: questions.map((q, i) => quizScreen(q, i)),
  };
}

// Bilan du test : réplique de Val selon le score
export function quizVerdict(correct: number, total: number): { line: string; mood: 'fier' | 'celebrant' | 'rassurant' } {
  if (total > 0 && correct === total) return { line: 'Tout juste. Tes déclics sont bien rangés.', mood: 'celebrant' };
  if (correct * 2 >= total) return { line: 'Bien gardé. Les autres reviendront vite.', mood: 'fier' };
  return { line: 'Ça arrive. Relis ton carnet, ils reviennent vite.', mood: 'rassurant' };
}
