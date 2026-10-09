// Dictionnaire : lecture de GET /dictionary/terms, recherche, mot du jour,
// suggestions, même famille, récents. Fonctions pures, sans React : testables
// avec Node. La clé d'un mot est son terme (le serveur n'envoie pas d'id).

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

// Récents encore présents dans le dictionnaire, avec leur fiche
export function recentEntries(entries: DictionaryEntry[], recents: string[]): DictionaryEntry[] {
  return recents.map((t) => findEntry(entries, t)).filter((e): e is DictionaryEntry => e !== null);
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
