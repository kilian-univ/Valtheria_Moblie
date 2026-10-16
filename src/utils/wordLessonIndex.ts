// Index mots du Dictionnaire ↔ leçons, construit sur le téléphone, sans
// React : testable avec Node. Pour chaque mot, les leçons dont les textes le
// contiennent (titre, questions, réponses, explications, répliques), accents
// et casse ignorés. Faux positifs évités :
// - un sigle n'est cherché qu'écrit en majuscules (« IS », pas « is ») ;
// - un mot seul de moins de 5 lettres, ou trop courant en français
//   (« action », « compte », « marché »…), n'est pas cherché ;
// - un mot n'est trouvé qu'entier (« prime » n'est pas dans « supprimer »),
//   pluriel en s ou x accepté.
// Le serveur ne relie pas encore les mots aux notions (docs/lot-serveur.md).

import { looksLikeAcronym } from './dictionary';

export type LessonText = { lessonId: number; title: string; text: string };
export type WordIndex = Record<string, number[]>;

// Mots du dictionnaire trop courants pour être reliés sans faux positifs
const COMMON = new Set([
  'action',
  'avoir',
  'base',
  'bien',
  'charge',
  'compte',
  'cours',
  'demande',
  'droit',
  'fonds',
  'marche',
  'note',
  'offre',
  'part',
  'prix',
  'reste',
  'titre',
  'travail',
  'valeur',
]);
const MIN_SINGLE_WORD = 5;

export function fold(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[’']/g, "'");
}

function escape(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Le moyen de chercher un mot dans un texte, ou null s'il ne doit pas l'être
export function wordMatcher(term: string): ((text: string, folded: string) => boolean) | null {
  const t = term.trim();
  if (!t) return null;
  if (looksLikeAcronym(t)) {
    const re = new RegExp(`(^|[^A-Za-z0-9])${escape(t)}(?![A-Za-z0-9])`);
    return (text) => re.test(text);
  }
  const f = fold(t).replace(/\s+/g, ' ');
  const single = !/[\s'-]/.test(f);
  if (single && (f.length < MIN_SINGLE_WORD || COMMON.has(f))) return null;
  const re = new RegExp(`(^|[^a-z0-9])${escape(f).replace(/ /g, '\\s+')}[sx]?(?![a-z0-9])`);
  return (_text, folded) => re.test(folded);
}

// Textes d'une leçon telle que servie (GET /lessons/{id}) : toutes les
// chaînes lisibles des écrans (questions, options, explications, répliques
// de Val…), sans les identifiants ni les noms techniques
const SKIP_KEYS = new Set(['id', 'type', 'mood', 'formula', 'mode', 'unit', 'key', 'kind', 'variant', 'slug', 'notion']);

export function lessonText(data: unknown): string {
  const out: string[] = [];
  const walk = (v: unknown, key: string | null) => {
    if (key && SKIP_KEYS.has(key)) return;
    if (typeof v === 'string') {
      if (v.trim().length >= 3) out.push(v.replace(/<[^>]+>/g, ' '));
    } else if (Array.isArray(v)) {
      v.forEach((x) => walk(x, null));
    } else if (v && typeof v === 'object') {
      for (const [k, x] of Object.entries(v)) walk(x, k);
    }
  };
  const d = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
  walk(d.title, null);
  walk(d.screens ?? (Array.isArray(data) ? data : null), null);
  return out.join('\n');
}

// Index : clé du mot (sans accents ni casse) → leçons, dans l'ordre reçu
export function buildWordIndex(terms: readonly string[], lessons: readonly LessonText[]): WordIndex {
  const prepared = lessons.map((l) => {
    const text = `${l.title}\n${l.text}`;
    return { id: l.lessonId, text, folded: fold(text) };
  });
  const index: WordIndex = {};
  for (const term of terms) {
    const match = wordMatcher(term);
    if (!match) continue;
    const ids = prepared.filter((l) => match(l.text, l.folded)).map((l) => l.id);
    if (ids.length > 0) index[fold(term).trim()] = ids;
  }
  return index;
}

// Signature des données de l'index : il est reconstruit quand elle change
// (mots ajoutés ou retirés, leçons ou textes changés)
export function indexSignature(terms: readonly string[], lessons: readonly LessonText[]): string {
  let h = 5381;
  const feed = (s: string) => {
    for (let i = 0; i < s.length; i++) h = (Math.imul(h, 33) + s.charCodeAt(i)) >>> 0;
  };
  [...terms].sort().forEach(feed);
  [...lessons].sort((a, b) => a.lessonId - b.lessonId).forEach((l) => feed(`${l.lessonId}|${l.title}|${l.text.length}`));
  return `${terms.length}-${lessons.length}-${h.toString(36)}`;
}

// Leçons d'un mot
export function lessonsOfWord(index: WordIndex, term: string): number[] {
  return index[fold(term).trim()] ?? [];
}

// Mots qui partagent au moins une leçon avec `term` (pour « Un autre mot ? »)
export function wordsInSameLessons(index: WordIndex, term: string, terms: readonly string[]): string[] {
  const own = new Set(lessonsOfWord(index, term));
  if (own.size === 0) return [];
  const self = fold(term).trim();
  return terms.filter((t) => fold(t).trim() !== self && lessonsOfWord(index, t).some((id) => own.has(id)));
}
