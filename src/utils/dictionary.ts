// Dictionnaire : lecture de GET /dictionary/terms, recherche, mot du jour,
// suggestions, même famille, récents. Fonctions pures, sans React : testables
// avec Node. La clé d'un mot est son terme (le serveur n'envoie pas d'id).

import type { DecorName } from './modulePath';

type AnyRecord = Record<string, any>;

export type DictionaryLesson = { id: number; title: string };

export type DictionaryEntry = {
  term: string;
  definition: string;
  category: string;
  // Phrase « en clair » ; null tant que le serveur ne l'envoie pas
  plain: string | null;
  // Leçons où le mot apparaît ; null tant que le serveur ne l'envoie pas
  lessons: DictionaryLesson[] | null;
};

function isRecord(v: unknown): v is AnyRecord {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function text(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const t = raw.replace(/\s+/g, ' ').trim();
  return t === '' ? null : t;
}

function lessons(raw: unknown): DictionaryLesson[] | null {
  if (!Array.isArray(raw)) return null;
  const list = raw
    .filter(isRecord)
    .map((l) => ({ id: l.id, title: text(l.title) }))
    .filter((l): l is DictionaryLesson => Number.isInteger(l.id) && l.id > 0 && l.title !== null);
  return list.length > 0 ? list : null;
}

// Un mot du serveur ; sans terme ni définition → null
export function normalizeEntry(raw: unknown): DictionaryEntry | null {
  if (!isRecord(raw)) return null;
  const term = text(raw.term);
  const definition = text(raw.definition);
  if (!term || !definition) return null;
  return {
    term,
    definition,
    category: text(raw.category) ?? 'Autre',
    plain: text(raw.plain),
    lessons: lessons(raw.lessons),
  };
}

// Liste du serveur → mots triés A-Z, sans doublon de terme
export function normalizeEntries(data: unknown): DictionaryEntry[] {
  if (!Array.isArray(data)) return [];
  const seen = new Set<string>();
  const out: DictionaryEntry[] = [];
  for (const raw of data) {
    const entry = normalizeEntry(raw);
    if (!entry) continue;
    const key = normalizeText(entry.term);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(entry);
  }
  return out.sort(compareTerms);
}

// ---------------------------------------------------------------------------
// Texte
// ---------------------------------------------------------------------------

// Sans accents, en minuscules, espaces en trop retirés : « Plus-Value  » et
// « plus-value » se valent
export function normalizeText(raw: string): string {
  return foldChars(raw).replace(/\s+/g, ' ').trim();
}

function foldChars(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

export function compareTerms(a: DictionaryEntry, b: DictionaryEntry): number {
  return a.term.localeCompare(b.term, 'fr', { sensitivity: 'base' });
}

// Lettre de rangement : A à Z, sans accent ; tout le reste → #
export function termLetter(term: string): string {
  const first = foldChars(term.trim()).charAt(0).toUpperCase();
  return first >= 'A' && first <= 'Z' ? first : '#';
}

export const ALPHABET: readonly string[] = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ', '#'];

// Partie du terme qui correspond à la recherche (indices dans le terme
// d'origine, accents compris) ; null si elle n'y est pas
export function highlightRange(term: string, query: string): { start: number; end: number } | null {
  const q = normalizeText(query);
  if (!q) return null;
  // Terme replié lettre à lettre, en gardant l'indice d'origine de chacune
  let folded = '';
  const origin: number[] = [];
  for (let i = 0; i < term.length; i++) {
    const f = foldChars(term[i]);
    for (const c of f) {
      folded += c;
      origin.push(i);
    }
  }
  const at = folded.indexOf(q);
  if (at < 0) return null;
  return { start: origin[at], end: origin[at + q.length - 1] + 1 };
}

// ---------------------------------------------------------------------------
// Recherche
// ---------------------------------------------------------------------------

// Mots qui commencent par la recherche, puis ceux qui la contiennent, puis
// ceux dont la définition la contient ; A-Z dans chaque groupe. Le filtre de
// catégorie s'applique aussi.
export function searchEntries(entries: DictionaryEntry[], query: string, category: string | null = null): DictionaryEntry[] {
  const q = normalizeText(query);
  const pool = category ? entries.filter((e) => e.category === category) : entries;
  if (!q) return pool;
  const ranked: { entry: DictionaryEntry; rank: number }[] = [];
  for (const entry of pool) {
    const term = normalizeText(entry.term);
    const rank = term.startsWith(q) ? 0 : term.includes(q) ? 1 : normalizeText(entry.definition).includes(q) ? 2 : -1;
    if (rank >= 0) ranked.push({ entry, rank });
  }
  return ranked.sort((a, b) => a.rank - b.rank || compareTerms(a.entry, b.entry)).map((r) => r.entry);
}

export type LetterSection = { title: string; data: DictionaryEntry[] };

// Sections A-Z (puis #) pour la liste
export function letterSections(entries: DictionaryEntry[]): LetterSection[] {
  const groups = new Map<string, DictionaryEntry[]>();
  for (const e of [...entries].sort(compareTerms)) {
    const letter = termLetter(e.term);
    const list = groups.get(letter);
    if (list) list.push(e);
    else groups.set(letter, [e]);
  }
  return ALPHABET.filter((l) => groups.has(l)).map((title) => ({ title, data: groups.get(title)! }));
}

// Catégories réelles, de la plus fournie à la moins fournie (A-Z à égalité)
export function categoriesByCount(entries: DictionaryEntry[]): { name: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const e of entries) counts.set(e.category, (counts.get(e.category) ?? 0) + 1);
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'fr'));
}

export function findEntry(entries: DictionaryEntry[], term: string | null | undefined): DictionaryEntry | null {
  if (!term) return null;
  const key = normalizeText(term);
  return entries.find((e) => normalizeText(e.term) === key) ?? null;
}

// ---------------------------------------------------------------------------
// Mot du jour
// ---------------------------------------------------------------------------

// Numéro du jour (calendrier local du téléphone) : le même toute la journée
export function dayNumber(date: Date): number {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000);
}

// Choisi dans la liste triée, à partir de la date seule : même mot pour tout
// le monde le même jour. Le brassage évite de suivre l'ordre alphabétique.
export function wordOfTheDay(entries: DictionaryEntry[], date: Date): DictionaryEntry | null {
  if (entries.length === 0) return null;
  const sorted = [...entries].sort(compareTerms);
  let h = Math.imul(dayNumber(date) ^ 0x5bd1e995, 0x9e3779b1);
  h ^= h >>> 15;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  return sorted[(h >>> 0) % sorted.length];
}

// ---------------------------------------------------------------------------
// Suggestions de frappe
// ---------------------------------------------------------------------------

export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

export const SUGGESTION_MAX_DISTANCE = 2;

// Mots proches de la recherche (distance d'édition de 2 au plus, sans
// accents), les plus proches d'abord
export function suggestions(entries: DictionaryEntry[], query: string, max = 2): DictionaryEntry[] {
  const q = normalizeText(query);
  if (q.length < 2) return [];
  return entries
    .map((entry) => ({ entry, d: editDistance(normalizeText(entry.term), q) }))
    .filter((s) => s.d > 0 && s.d <= SUGGESTION_MAX_DISTANCE)
    .sort((a, b) => a.d - b.d || compareTerms(a.entry, b.entry))
    .slice(0, max)
    .map((s) => s.entry);
}

// ---------------------------------------------------------------------------
// Fiche
// ---------------------------------------------------------------------------

// Autres mots de la même catégorie : ceux qui suivent dans l'ordre A-Z (on
// repart au début en fin de liste)
export function sameFamily(entries: DictionaryEntry[], entry: DictionaryEntry, max = 3): DictionaryEntry[] {
  const family = entries.filter((e) => e.category === entry.category).sort(compareTerms);
  const at = family.findIndex((e) => normalizeText(e.term) === normalizeText(entry.term));
  const others = at < 0 ? family : [...family.slice(at + 1), ...family.slice(0, at)];
  return others.slice(0, max);
}

export function shareMessage(entry: DictionaryEntry): string {
  return `${entry.term} : ${entry.definition} (Valtheria)`;
}

// ---------------------------------------------------------------------------
// Récemment consultés
// ---------------------------------------------------------------------------

export const RECENTS_MAX = 3;

// Le mot ouvert passe en tête, sans doublon (accents et casse ignorés)
export function pushRecent(recents: string[], term: string, max = RECENTS_MAX): string[] {
  const key = normalizeText(term);
  return [term, ...recents.filter((t) => normalizeText(t) !== key)].slice(0, max);
}

// Mots (récents, mes mots) encore présents dans le dictionnaire, avec leur
// fiche, dans l'ordre donné
export function entriesForTerms(entries: DictionaryEntry[], terms: string[]): DictionaryEntry[] {
  return terms.map((t) => findEntry(entries, t)).filter((e): e is DictionaryEntry => e !== null);
}

// ---------------------------------------------------------------------------
// Mes mots
// ---------------------------------------------------------------------------

export function isFavorite(favorites: string[], term: string): boolean {
  const key = normalizeText(term);
  return favorites.some((t) => normalizeText(t) === key);
}

// Ajoute le mot en tête, ou le retire s'il y est déjà (accents et casse
// ignorés) ; jamais de doublon
export function toggleFavorite(favorites: string[], term: string): string[] {
  const key = normalizeText(term);
  const others = favorites.filter((t) => normalizeText(t) !== key);
  return others.length < favorites.length ? others : [term, ...others];
}

// ---------------------------------------------------------------------------
// Mot précédent et mot suivant
// ---------------------------------------------------------------------------

// Voisins dans l'ordre A-Z, dans la catégorie filtrée s'il y en a une (si le
// mot n'y est pas, dans tout le dictionnaire). null aux bornes.
export function neighbors(
  entries: DictionaryEntry[],
  entry: DictionaryEntry,
  category: string | null = null
): { previous: DictionaryEntry | null; next: DictionaryEntry | null } {
  const key = normalizeText(entry.term);
  const inCategory = category ? entries.filter((e) => e.category === category) : [];
  const pool = inCategory.some((e) => normalizeText(e.term) === key) ? inCategory : entries;
  const sorted = [...pool].sort(compareTerms);
  const at = sorted.findIndex((e) => normalizeText(e.term) === key);
  if (at < 0) return { previous: null, next: null };
  return { previous: sorted[at - 1] ?? null, next: sorted[at + 1] ?? null };
}

// ---------------------------------------------------------------------------
// Illustration de la fiche
// ---------------------------------------------------------------------------

// Seule table catégorie → décor peint (assets/images/decor), faite sur les
// catégories réelles du serveur (DictionaryTermSeeder du site, 12 catégories
// pour 11 décors) ; accents et casse ignorés
const CATEGORY_DECORS: Record<string, DecorName> = {
  bourse: 'graphique', // courbes de cours
  trading: 'graphique', // courbes, comme la bourse
  etf: 'coffre-fort', // placement de long terme, à l'abri
  crypto: 'pile-pieces', // jetons
  banque: 'banque',
  epargne: 'tirelire',
  budget: 'enveloppe', // méthode des enveloppes
  fiscalite: 'calculatrice', // calcul de l'impôt
  entreprise: 'carnet', // comptes, registres
  immobilier: 'cle',
  economie: 'plante', // croissance
  retraite: 'sablier', // le temps long
};

// Les 11 décors, pour une catégorie absente de la table
const ALL_DECORS: readonly DecorName[] = [
  'pile-pieces',
  'tirelire',
  'coffre-fort',
  'plante',
  'graphique',
  'calculatrice',
  'carnet',
  'sablier',
  'cle',
  'enveloppe',
  'banque',
];

// Décor d'une catégorie : celui de la table, sinon un décor tiré du nom de la
// catégorie (toujours le même pour la même catégorie)
export function decorForCategory(category: string): DecorName {
  const key = normalizeText(category);
  if (Object.hasOwn(CATEGORY_DECORS, key)) return CATEGORY_DECORS[key];
  return ALL_DECORS[hashText(key) % ALL_DECORS.length];
}

// ---------------------------------------------------------------------------
// Teste-toi
// ---------------------------------------------------------------------------

export type QuizAnswer = { label: string; correct: boolean };

export type Quiz = {
  // 'term' : « Quel mot (ou sigle) correspond à cette définition ? » ;
  // 'definition' : « Que veut dire <mot> ? » (jamais pour un sigle)
  kind: 'term' | 'definition';
  // Mot sur lequel porte la question : jamais celui de la fiche
  subject: string;
  question: string;
  // Définition affichée sous la question (kind 'term'), sans développé, mot masqué
  quote: string | null;
  answers: QuizAnswer[];
  correctLabel: string;
};

// Raison pour laquelle un tirage a été écarté par le garde-fou
export type QuizRejection = 'indice' | 'pas-assez-de-reponses';

export const QUIZ_ANSWERS = 3;
// Écart de longueur toléré avec la bonne réponse
export const LENGTH_SPREAD = 0.25;
// Deux définitions qui partagent autant de mots importants disent la même
// chose : la seconde serait aussi une bonne réponse
const SAME_MEANING = 0.6;
// Tirages successifs essayés avant de renoncer (garde-fou)
const QUIZ_ATTEMPTS = 12;
// Deux mots de même racine : mêmes 5 premières lettres (sans accent ni
// casse). Un mot de 5 lettres pile garde ses 4 premières : « impôt » (impot)
// et « imposition » (impos) n'en ont que 4 en commun.
const ROOT_LENGTH = 5;
const ROOT_MIN_WORD = 5;

// Petits mots ignorés pour comparer deux définitions
const STOPWORDS = new Set(
  (
    'le la les l de des du d un une et ou a au aux en pour qui que qu est sont ce cet cette ces se sa son ses ' +
    'sur par dans avec sans plus moins ne pas il elle on y leur leurs tout tous toute toutes etc ainsi comme'
  ).split(' ')
);

// Petits mots sautés pour lire les initiales d'un développé
// (« Impôt sur les sociétés » → IS, « Plan d'épargne en actions » → PEA)
const SMALL_WORDS = new Set('sur les de des du la le l d a et en au aux'.split(' '));

// Mots importants d'un texte : sans accents, sans petits mots, pluriel ôté
export function significantWords(text: string): Set<string> {
  const words = foldChars(text)
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w))
    .map((w) => (w.length > 4 ? w.replace(/[sx]$/, '') : w));
  return new Set(words);
}

// Nombre de mots importants en commun
export function sharedWords(a: string, b: string): number {
  const wa = significantWords(a);
  let n = 0;
  for (const w of significantWords(b)) if (wa.has(w)) n++;
  return n;
}

// Même sens, ou presque (mots importants communs / plus petit ensemble)
export function sameMeaning(a: string, b: string): boolean {
  if (normalizeText(a) === normalizeText(b)) return true;
  const wa = significantWords(a);
  const wb = significantWords(b);
  const smaller = Math.min(wa.size, wb.size);
  return smaller > 0 && sharedWords(a, b) / smaller >= SAME_MEANING;
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// ---------------------------------------------------------------------------
// Sigles et développés
// ---------------------------------------------------------------------------

type Token = { word: string; start: number; end: number };

// Lettres et chiffres (sans \p{…} ni lookbehind dans les expressions
// régulières : pas sûr qu'ils passent partout)
const WORD_CHARS = 'A-Za-z0-9À-ÖØ-öø-ÿŒœÆæ';
const WORD = new RegExp(`[${WORD_CHARS}]+`, 'g');
const WORD_CHAR = new RegExp(`[${WORD_CHARS}]`);

// Mots d'un texte avec leur position (les traits d'union et apostrophes
// séparent : « Compte-titres » → Compte, titres ; « d'épargne » → d, épargne)
function tokens(text: string): Token[] {
  const out: Token[] = [];
  for (const m of text.matchAll(WORD)) out.push({ word: m[0], start: m.index!, end: m.index! + m[0].length });
  return out;
}

// Lettres d'un sigle (« CAC 40 » → CAC, « Smic » → SMIC)
function acronymLetters(term: string): string {
  return foldChars(term).replace(/[^a-z]/g, '').toUpperCase();
}

// Écrit comme un sigle : majuscules, 2 à 6 caractères (chiffres et points
// permis), éventuellement suivi d'un nombre (« CAC 40 »)
function looksLikeAcronym(term: string): boolean {
  const t = term.trim();
  const compact = t.replace(/\s+/g, '');
  return /^[A-Z][A-Z0-9.]*(?: [A-Z0-9.]+)?$/.test(t) && /[A-Z].*[A-Z0-9]/.test(compact) && compact.length <= 6;
}

// Développé d'un sigle à partir du mot `from` : suite de mots dont les
// initiales, petits mots sautés, donnent les lettres. Renvoie la fin du
// développé dans le texte, ou -1.
function expansionEnd(list: Token[], from: number, letters: string): number {
  if (letters.length < 2) return -1;
  let i = from;
  let k = 0;
  let end = -1;
  while (i < list.length && k < letters.length) {
    const w = foldChars(list[i].word);
    if (SMALL_WORDS.has(w) && k > 0) {
      i++;
      continue;
    }
    if (w.charAt(0).toUpperCase() !== letters[k]) return -1;
    end = list[i].end;
    k++;
    i++;
  }
  return k === letters.length ? end : -1;
}

// Développé du sigle en tête de la définition (« Impôt sur les sociétés. … »)
function leadingExpansion(definition: string, letters: string): string | null {
  const end = expansionEnd(tokens(definition), 0, letters);
  return end > 0 ? definition.slice(0, end) : null;
}

// Un mot est un sigle s'il s'écrit comme un sigle, ou si sa définition
// commence par son développé (« Smic : Salaire minimum interprofessionnel de
// croissance… »)
export function isAcronym(entry: Pick<DictionaryEntry, 'term' | 'definition'>): boolean {
  if (looksLikeAcronym(entry.term)) return true;
  const letters = acronymLetters(entry.term);
  return letters.length >= 2 && letters.length <= 6 && !/\s/.test(entry.term.trim()) && leadingExpansion(entry.definition, letters) !== null;
}

// Développé d'un sigle trouvé dans sa définition (en tête ou entre
// parenthèses), ou null
export function expansionOf(entry: Pick<DictionaryEntry, 'term' | 'definition'>): string | null {
  if (!isAcronym(entry)) return null;
  const letters = acronymLetters(entry.term);
  const lead = leadingExpansion(entry.definition, letters);
  if (lead) return lead;
  for (const m of entry.definition.matchAll(/\(([^)]*)\)/g)) {
    const inner = m[1].trim();
    if (expansionEnd(tokens(inner), 0, letters) === inner.length) return inner;
  }
  return null;
}

// Retire le développé du sigle `term` : en tête (suivi de « . », « — »,
// « : »…) et entre parenthèses ; retire aussi « (SIGLE) »
export function removeExpansion(definition: string, term: string): string {
  const letters = acronymLetters(term);
  let text = definition;
  const lead = leadingExpansion(text, letters);
  if (lead) text = text.slice(lead.length).replace(/^[\s.,;:—–-]+/, '').replace(/^\([^)]*\)[\s.,;:—–-]*/, '');
  text = text.replace(/\s*\(([^)]*)\)/g, (whole, inner: string) => {
    const t = inner.trim();
    const isExpansion = expansionEnd(tokens(t), 0, letters) === t.length;
    const isSigle = acronymLetters(t) === letters && t.replace(/[^A-Za-z]/g, '') === t.replace(/[^A-Za-z]/g, '').toUpperCase();
    return isExpansion || isSigle ? '' : whole;
  });
  return capitalize(text.trim());
}

// Définition nettoyée : sans sigle ni développé en tête (« QE — … »,
// « BCE : … », « Federal Reserve — … »), sans le développé de son propre
// sigle si `term` en est un, première phrase seulement. Vide si la
// définition n'était que le développé (« Produit intérieur brut. »).
export function cleanDefinition(definition: string, term?: string): string {
  let text = definition.replace(/\s+/g, ' ').trim();
  if (term && isAcronym({ term, definition: text })) text = removeExpansion(text, term);
  const prefix = text.match(/^([^—–:.]{1,40}?)\s*[—–:]\s+(.+)$/);
  if (prefix && prefix[1].trim().split(' ').length <= 5) text = capitalize(prefix[2].trim());
  const first = text.match(/^.+?[.!?](?=\s|$)/)?.[0] ?? text;
  return WORD_CHAR.test(first) ? first : '';
}

// Définition d'un mot telle qu'on la propose : nettoyée, sans son développé
function entryDefinition(e: DictionaryEntry): string {
  return cleanDefinition(e.definition, e.term);
}

// Renvoi vers un autre mot (« voir Capitalisation. ») ou définition vide une
// fois le développé retiré : jamais proposé dans un jeu
function isPlayable(e: DictionaryEntry): boolean {
  const def = entryDefinition(e);
  return def !== '' && !/^voir\b/i.test(normalizeText(def));
}

// Sigle d'un terme : le terme lui-même s'il est déjà un sigle (« ETF »),
// sinon les initiales de ses mots importants (« Quantitative Easing » → QE)
export function acronymOf(term: string): string | null {
  const t = term.trim();
  if (looksLikeAcronym(t)) return t;
  const words = t.split(/[\s'’-]+/).filter((w) => w.length > 2 && !STOPWORDS.has(foldChars(w)));
  return words.length >= 2 ? words.map((w) => foldChars(w).charAt(0).toUpperCase()).join('') : null;
}

// ---------------------------------------------------------------------------
// Masquage
// ---------------------------------------------------------------------------

function replaceRanges(text: string, ranges: [number, number][]): string {
  let out = text;
  for (const [start, stop] of [...ranges].sort((x, y) => y[0] - x[0])) out = `${out.slice(0, start)}…${out.slice(stop)}`;
  return out.replace(/…(\s*…)+/g, '…');
}

// Occurrences d'une expression (accents et casse ignorés, mots entiers,
// pluriel compris)
function phraseRanges(text: string, phrase: string): [number, number][] {
  const target = foldChars(phrase);
  if (target.length < 2) return [];
  let folded = '';
  const origin: number[] = [];
  for (let i = 0; i < text.length; i++) {
    for (const c of foldChars(text[i])) {
      folded += c;
      origin.push(i);
    }
  }
  const isLetter = (c: string | undefined) => !!c && /[a-z0-9]/.test(c);
  const out: [number, number][] = [];
  let from = 0;
  while (from <= folded.length) {
    const at = folded.indexOf(target, from);
    if (at < 0) break;
    let end = at + target.length;
    if ((folded[end] === 's' || folded[end] === 'x') && !isLetter(folded[end + 1])) end += 1;
    if (!isLetter(folded[at - 1]) && !isLetter(folded[end])) out.push([origin[at], origin[end - 1] + 1]);
    from = at + target.length;
  }
  return out;
}

// Sigle écrit tel quel (casse respectée : « IS » oui, « is » non)
function acronymRanges(text: string, acronym: string): [number, number][] {
  const out: [number, number][] = [];
  let from = 0;
  while (from <= text.length) {
    const at = text.indexOf(acronym, from);
    if (at < 0) break;
    const end = at + acronym.length;
    if (!WORD_CHAR.test(text[at - 1] ?? '') && !WORD_CHAR.test(text[end] ?? '')) out.push([at, end]);
    from = end;
  }
  return out;
}

// Racines des mots longs d'un texte (5 premières lettres, 4 pour un mot de
// 5 lettres)
function roots(text: string): Set<string> {
  const out = new Set<string>();
  for (const t of tokens(text)) {
    const w = foldChars(t.word);
    if (w.length >= ROOT_MIN_WORD && !STOPWORDS.has(w)) out.add(w.slice(0, w.length === ROOT_MIN_WORD ? ROOT_LENGTH - 1 : ROOT_LENGTH));
  }
  return out;
}

function hasRoot(word: string, list: Set<string>): boolean {
  const w = foldChars(word);
  if (w.length < ROOT_LENGTH - 1) return false;
  for (const r of list) if (w.startsWith(r)) return true;
  return false;
}

// Tout ce qui trahit le mot de la question : le mot, son sigle, son
// développé, et les racines de leurs mots longs
type Giveaway = { phrases: string[]; acronyms: string[]; roots: Set<string> };

function giveawayOf(subject: DictionaryEntry): Giveaway {
  const expansion = expansionOf(subject);
  const acronym = acronymOf(subject.term);
  // Un terme écrit comme un sigle se cherche tel quel, en majuscules
  // (acronyms) : « is » en minuscules n'est pas le sigle IS
  const phrases = [looksLikeAcronym(subject.term) ? null : subject.term, expansion].filter((p): p is string => !!p);
  return {
    phrases,
    acronyms: acronym ? [acronym] : [],
    roots: new Set([...roots(subject.term), ...(expansion ? roots(expansion) : [])]),
  };
}

function giveawayRanges(text: string, g: Giveaway): [number, number][] {
  const ranges: [number, number][] = [];
  for (const p of g.phrases) ranges.push(...phraseRanges(text, p));
  for (const a of g.acronyms) ranges.push(...acronymRanges(text, a));
  for (const t of tokens(text)) if (hasRoot(t.word, g.roots)) ranges.push([t.start, t.end]);
  // Fusion des recouvrements
  const sorted = ranges.sort((x, y) => x[0] - y[0]);
  const merged: [number, number][] = [];
  for (const r of sorted) {
    const last = merged[merged.length - 1];
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
    else merged.push([...r]);
  }
  return merged;
}

// Remplace par « … » le mot de la question, son sigle, son développé et les
// mots de même racine (« impôt » / « imposition » / « imposable »)
export function maskSubject(text: string, subject: DictionaryEntry): string {
  return replaceRanges(text, giveawayRanges(text, giveawayOf(subject)));
}

// Le texte trahit-il encore le mot de la question ? (garde-fou)
export function revealsSubject(text: string, subject: DictionaryEntry): boolean {
  return giveawayRanges(text, giveawayOf(subject)).length > 0;
}

// Après masquage, il doit rester de quoi lire : au moins 2 mots importants.
// Une réponse presque entièrement masquée serait elle aussi un indice.
export function tooMasked(text: string): boolean {
  return significantWords(text.replace(/…/g, ' ')).size < 2;
}

// Ancienne interface : masque un terme seul (et son sigle)
export function maskTerm(text: string, term: string): string {
  return maskSubject(text, { term, definition: '', category: '', plain: null, lessons: null });
}

// ---------------------------------------------------------------------------
// Tirage
// ---------------------------------------------------------------------------

// Tirage pseudo-aléatoire stable (mulberry32)
function rng(seed: number): () => number {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashText(text: string): number {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = (Math.imul(h, 33) + text.charCodeAt(i)) >>> 0;
  return h;
}

function shuffled<T>(list: T[], random: () => number): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function lengthGap(a: number, b: number): number {
  return Math.abs(a - b) / Math.max(b, 1);
}

// Mauvaises réponses crédibles pour une question sur `subject` :
// - d'abord la même catégorie, en commençant par les mots dont la
//   définition partage le plus de mots importants avec la sienne, puis de
//   longueur proche (définition ou mot selon `kind`) ; le reste du
//   dictionnaire seulement s'il en manque ;
// - `only` restreint les candidats (sigles pour une question sur un sigle) ;
// - jamais un mot exclu, une définition injouable (renvoi « voir … », vide),
//   une réponse en double, ni une réponse qui serait aussi correcte.
export function pickDistractors(
  entries: DictionaryEntry[],
  subject: DictionaryEntry,
  exclude: string[],
  count: number,
  random: () => number,
  kind: Quiz['kind'] = 'definition',
  only: (e: DictionaryEntry) => boolean = () => true
): DictionaryEntry[] {
  const excluded = new Set([subject.term, ...exclude].map(normalizeText));
  const subjectDef = entryDefinition(subject);
  const size = (e: DictionaryEntry) => (kind === 'term' ? e.term.length : entryDefinition(e).length);
  const target = size(subject);
  const usable = entries.filter(
    (e) => only(e) && !excluded.has(normalizeText(e.term)) && isPlayable(e) && !sameMeaning(entryDefinition(e), subjectDef)
  );
  // Ordre de préférence : proximité du sens (mots importants en commun),
  // moins deux points si la longueur s'écarte de plus de 25 % de la bonne
  // réponse (aucune réponse n'est jamais coupée : seul le classement garde
  // des longueurs proches), puis longueur la plus proche ; le tirage
  // départage les égalités (stable pour un même tirage)
  const rank = (list: DictionaryEntry[]) =>
    shuffled(list, random)
      .map((e) => {
        const gap = lengthGap(size(e), target);
        return { e, score: sharedWords(entryDefinition(e), subjectDef) - (gap > LENGTH_SPREAD ? 2 : 0), gap };
      })
      .sort((a, b) => b.score - a.score || a.gap - b.gap)
      .map((x) => x.e);
  const same = rank(usable.filter((e) => e.category === subject.category));
  const rest = rank(usable.filter((e) => e.category !== subject.category));

  const out: DictionaryEntry[] = [];
  const seen = new Set<string>([normalizeText(kind === 'term' ? subject.term : subjectDef)]);
  for (const e of [...same, ...rest]) {
    if (out.length >= count) break;
    const key = normalizeText(kind === 'term' ? e.term : entryDefinition(e));
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(e);
  }
  return out;
}

// Un tirage : sujet, type de question, réponses. null si impossible (pas
// assez de réponses) ; le garde-fou est appliqué par quizFor.
function drawQuiz(
  entries: DictionaryEntry[],
  entry: DictionaryEntry,
  random: () => number
): { quiz: Quiz; check: string[]; subject: DictionaryEntry } | null {
  const self = normalizeText(entry.term);
  const others = entries.filter((e) => normalizeText(e.term) !== self && isPlayable(e));
  const sameCategory = others.filter((e) => e.category === entry.category);
  const pool = sameCategory.length > 0 ? sameCategory : others;
  if (pool.length === 0) return null;

  const subject = pool[Math.floor(random() * pool.length)];
  const sigle = isAcronym(subject);
  // Jamais « Que veut dire <sigle> ? » : la réponse commencerait par son développé
  const kind: Quiz['kind'] = sigle || random() < 0.5 ? 'term' : 'definition';
  const quote = maskSubject(entryDefinition(subject), subject);

  // Mauvaises réponses : sans le mot de la fiche ; avec lui seulement s'il en
  // manque. Sigle : d'autres sigles. Mot normal : d'abord des mots normaux.
  // Question « Quel mot… ? » : jamais un mot cité dans la définition affichée
  const notQuoted = (e: DictionaryEntry) => kind !== 'term' || phraseRanges(quote, e.term).length === 0;
  const pick = (only: (e: DictionaryEntry) => boolean) => {
    const allowed = (e: DictionaryEntry) => only(e) && notQuoted(e);
    let wrong = pickDistractors(entries, subject, [entry.term], QUIZ_ANSWERS - 1, random, kind, allowed);
    if (wrong.length < QUIZ_ANSWERS - 1) wrong = pickDistractors(entries, subject, [], QUIZ_ANSWERS - 1, random, kind, allowed);
    return wrong;
  };
  let wrong = sigle ? pick(isAcronym) : kind === 'term' ? pick((e) => !isAcronym(e)) : pick(() => true);
  if (!sigle && kind === 'term' && wrong.length < QUIZ_ANSWERS - 1) wrong = pick(() => true);
  if (wrong.length < QUIZ_ANSWERS - 1) return null;

  if (kind === 'term') {
    const answers = shuffled(
      [{ label: subject.term, correct: true }, ...wrong.map((e) => ({ label: e.term, correct: false }))],
      random
    );
    return {
      subject,
      // Garde-fou : la définition affichée ne doit rien trahir
      check: [quote],
      quiz: {
        kind,
        subject: subject.term,
        question: sigle ? 'Quel sigle correspond à cette définition ?' : 'Quel mot correspond à cette définition ?',
        quote,
        answers,
        correctLabel: subject.term,
      },
    };
  }

  // Même forme pour les trois : première phrase entière, nettoyée, sans
  // développé, mot de la question masqué. Jamais coupée (une coupure serait
  // un indice) : elle passe sur plusieurs lignes si besoin.
  const label = (e: DictionaryEntry) => maskSubject(entryDefinition(e), subject);
  const answers = shuffled(
    [{ label: label(subject), correct: true }, ...wrong.map((e) => ({ label: label(e), correct: false }))],
    random
  );
  return {
    subject,
    check: answers.map((a) => a.label),
    quiz: { kind, subject: subject.term, question: `Que veut dire ${subject.term} ?`, quote: null, answers, correctLabel: label(subject) },
  };
}

// Question du jour pour la fiche d'un mot : la même à chaque ouverture le même
// jour ; `round` (« Une autre question ») en tire une autre. Elle porte
// TOUJOURS sur un autre mot (`subject`), de la même catégorie si possible,
// sinon du dictionnaire : la définition du mot de la fiche est déjà affichée
// juste au-dessus. Le mot de la fiche n'est jamais la bonne réponse, et n'est
// une mauvaise réponse que si le dictionnaire est trop petit pour l'éviter.
// Un sigle n'est jamais demandé par « Que veut dire… ? ».
// Garde-fou, sur ce qui sera affiché (après masquage) : un tirage dont une
// réponse (ou la définition affichée) contient encore le mot, son sigle, son
// développé ou un mot de même racine, ou n'a presque plus que des « … », est
// écarté (`onReject`), et on tire à nouveau. null si le dictionnaire a moins de 3
// mots ou si aucun tirage ne passe.
export function quizFor(
  unsorted: DictionaryEntry[],
  entry: DictionaryEntry,
  date: Date,
  round = 0,
  onReject?: (reason: QuizRejection, quiz: Quiz | null) => void
): Quiz | null {
  if (unsorted.length < QUIZ_ANSWERS) return null;
  // Tirage indépendant de l'ordre reçu
  const entries = [...unsorted].sort(compareTerms);
  const random = rng(hashText(normalizeText(entry.term)) ^ Math.imul(dayNumber(date), 0x9e3779b1) ^ Math.imul(round + 1, 0x85ebca6b));
  for (let attempt = 0; attempt < QUIZ_ATTEMPTS; attempt++) {
    const draw = drawQuiz(entries, entry, random);
    if (!draw) {
      onReject?.('pas-assez-de-reponses', null);
      continue;
    }
    if (draw.check.some((text) => revealsSubject(text, draw.subject) || tooMasked(text))) {
      onReject?.('indice', draw.quiz);
      continue;
    }
    return draw.quiz;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Erreurs
// ---------------------------------------------------------------------------

// ApiContext ne transmet que le message : 401 de Laravel = « Unauthenticated. »
export function isUnauthorized(err: unknown): boolean {
  const message = err instanceof Error ? err.message : '';
  return /unauthenticated|unauthori[sz]ed|401/i.test(message);
}

// « 1 mot », « 2 mots »
export function wordsLabel(count: string | number, n: number): string {
  return `${count} ${n >= 2 ? 'mots' : 'mot'}`;
}

// En-tête de lettre collé en haut de la liste : la dernière lettre dont
// l'en-tête a atteint le haut (offset dans la liste, moins la zone de
// l'heure) ; null tant qu'aucune n'y est arrivée
export function stuckLetter(headers: readonly { title: string; offset: number }[], scrollY: number, top: number): string | null {
  let found: string | null = null;
  for (const h of headers) {
    if (h.offset - top <= scrollY) found = h.title;
    else break;
  }
  return found;
}
