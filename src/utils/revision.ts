// Révision quotidienne, sans React : testable avec Node.
//
// Chaque jour, une révision est tirée (la même toute la journée) parmi :
// - les écrans notés des leçons terminées (pas les paris, révélations ni
//   simulateurs : isGradable), gardés sur le téléphone ;
// - les déclics du carnet (même test à mot masqué que le carnet).
// Nombre d'écrans : de 4 à 10 selon ce que la personne a déjà appris, moins
// s'il y a peu de matière.
// Priorités : les écrans ratés (au premier essai d'une leçon, ou à la
// dernière révision) ; puis ceux vus il y a le plus longtemps ; en mélangeant
// les univers. Jamais deux fois le même écran, jamais un écran de la
// révision de la veille, sauf s'il y a été raté.

import type { LessonScreen } from '@/src/lesson/model';
import { normalizeScreen } from '@/src/lesson/normalize';
import { isGradable } from './lessonPlayer';
import { type Declic, type QuizQuestion, quizQuestionFor, quizScreen } from './notebook';

export const REVISION_MIN = 4;
export const REVISION_MAX = 10;
// Une leçon terminée de plus tous les LESSONS_PER_SCREEN : un écran de plus
export const LESSONS_PER_SCREEN = 3;

// Écran gardé d'une leçon terminée : sa forme du serveur, telle quelle
export type RawScreen = Record<string, unknown>;

export type CachedLesson = {
  lessonId: number;
  title: string | null;
  universeSlug: string | null;
  // Écrans notés, avec leur position dans la leçon
  screens: { index: number; raw: RawScreen }[];
  // Mise en cache (ISO)
  at: string;
};

// Dernier passage d'un écran ou d'un déclic : en leçon ou en révision
export type SeenRecord = { at: string; correct: boolean; from: 'lecon' | 'revision' };
export type SeenHistory = Record<string, SeenRecord>;

export type PlanItem =
  | { key: string; kind: 'screen'; lessonId: number; index: number; universe: string | null }
  | { key: string; kind: 'declic'; universe: string | null; question: QuizQuestion };

export type DailyPlan = {
  day: string;
  items: PlanItem[];
  // Fin de la révision : score et instant
  done: { at: string; correct: number; total: number } | null;
};

export const screenKey = (lessonId: number, index: number) => `e:${lessonId}:${index}`;
export const declicKey = (text: string) => `d:${text.trim()}`;

// Écrans notés d'une leçon (forme du serveur) : ceux que la révision peut
// rejouer
export function gradableScreens(rawScreens: unknown): { index: number; raw: RawScreen }[] {
  if (!Array.isArray(rawScreens)) return [];
  const out: { index: number; raw: RawScreen }[] = [];
  rawScreens.forEach((raw, index) => {
    if (!raw || typeof raw !== 'object') return;
    const screen: LessonScreen = normalizeScreen(raw, index);
    if (isGradable(screen)) out.push({ index, raw: raw as RawScreen });
  });
  return out;
}

// Nombre d'écrans visé : 4 au départ, un de plus toutes les 3 leçons
// terminées, 10 au plus ; jamais plus que la matière disponible
export function revisionSize(lessonsDone: number, available: number): number {
  const target = Math.min(REVISION_MAX, REVISION_MIN + Math.floor(Math.max(0, lessonsDone) / LESSONS_PER_SCREEN));
  return Math.max(0, Math.min(target, available));
}

export type Candidate = {
  key: string;
  universe: string | null;
  failed: boolean;
  // Dernier passage connu (ISO), null : inconnu (passe en premier)
  lastSeen: string | null;
  item: PlanItem;
};

// Tirage reproductible pour un jour donné (même révision toute la journée,
// même si la mémoire devait être relue)
export function seededRandom(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(list: readonly T[], random: () => number): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// Du plus ancien au plus récent (inconnu d'abord) ; à égalité, l'ordre déjà
// mélangé est gardé
function byOldest(list: Candidate[]): Candidate[] {
  return list
    .map((c, i) => ({ c, i }))
    .sort((a, b) => {
      const x = a.c.lastSeen ?? '';
      const y = b.c.lastSeen ?? '';
      return x < y ? -1 : x > y ? 1 : a.i - b.i;
    })
    .map((x) => x.c);
}

// Tour à tour dans chaque univers (dans l'ordre de leur meilleur candidat),
// jusqu'à `count`
function roundRobin(sorted: Candidate[], count: number): Candidate[] {
  const groups: Candidate[][] = [];
  const index = new Map<string, number>();
  for (const c of sorted) {
    const u = c.universe ?? '';
    if (!index.has(u)) {
      index.set(u, groups.length);
      groups.push([]);
    }
    groups[index.get(u)!].push(c);
  }
  const out: Candidate[] = [];
  for (let round = 0; out.length < count; round++) {
    let added = false;
    for (const g of groups) {
      if (out.length >= count) break;
      if (round < g.length) {
        out.push(g[round]);
        added = true;
      }
    }
    if (!added) break;
  }
  return out;
}

// Ordre de jeu : jamais deux écrans du même univers à la suite quand c'est
// possible
export function interleave(list: readonly Candidate[]): Candidate[] {
  const rest = [...list];
  const out: Candidate[] = [];
  while (rest.length > 0) {
    const prev = out[out.length - 1]?.universe;
    const i = rest.findIndex((c) => prev === undefined || c.universe !== prev);
    out.push(rest.splice(i < 0 ? 0 : i, 1)[0]);
  }
  return out;
}

// Révision du jour : les candidats retenus, dans l'ordre de jeu
export function pickRevision({
  candidates,
  lessonsDone,
  yesterday,
  random,
}: {
  candidates: readonly Candidate[];
  lessonsDone: number;
  // Révision de la veille (null : aucune) et ses résultats
  yesterday: { keys: readonly string[] } | null;
  random: () => number;
}): Candidate[] {
  // Sans doublon (le premier gardé)
  const seen = new Set<string>();
  const unique = candidates.filter((c) => (seen.has(c.key) ? false : (seen.add(c.key), true)));
  const before = new Set(yesterday?.keys ?? []);
  const eligible = unique.filter((c) => !before.has(c.key) || c.failed);
  const size = revisionSize(lessonsDone, eligible.length);
  if (size === 0) return [];

  const mixed = shuffle(eligible, random);
  const failed = byOldest(mixed.filter((c) => c.failed));
  const others = byOldest(mixed.filter((c) => !c.failed));
  const picked = roundRobin(failed, size);
  const chosen = [...picked, ...roundRobin(others, size - picked.length)];
  return interleave(chosen);
}

// ---------------------------------------------------------------------------
// Matière : candidats à partir des leçons gardées et du carnet
// ---------------------------------------------------------------------------

export function buildCandidates({
  lessons,
  declics,
  history,
  lessonDoneAt,
  random,
}: {
  lessons: readonly CachedLesson[];
  declics: readonly Declic[];
  history: SeenHistory;
  // Fin de la leçon, connue sur ce téléphone (ISO)
  lessonDoneAt: (lessonId: number) => string | null;
  random: () => number;
}): Candidate[] {
  const out: Candidate[] = [];
  for (const lesson of lessons) {
    for (const s of lesson.screens) {
      const key = screenKey(lesson.lessonId, s.index);
      const h = history[key];
      out.push({
        key,
        universe: lesson.universeSlug,
        failed: h ? !h.correct : false,
        // Leçon terminée ailleurs (date inconnue) : comptée comme la plus ancienne
        lastSeen: h?.at ?? lessonDoneAt(lesson.lessonId),
        item: { key, kind: 'screen', lessonId: lesson.lessonId, index: s.index, universe: lesson.universeSlug },
      });
    }
  }
  for (const d of declics) {
    const question = quizQuestionFor(d, declics, random);
    if (!question) continue;
    const key = declicKey(d.text);
    const h = history[key];
    out.push({
      key,
      universe: d.universeSlug,
      failed: h ? !h.correct : false,
      lastSeen: h?.at ?? d.at,
      item: { key, kind: 'declic', universe: d.universeSlug, question },
    });
  }
  return out;
}

// Leçon au format du serveur, jouée dans le lecteur des leçons (passe par
// normalizeLesson). Un écran introuvable (leçon oubliée) est omis.
export function revisionLesson(items: readonly PlanItem[], lessons: readonly CachedLesson[]): { title: string; screens: unknown[]; keys: string[] } {
  const screens: unknown[] = [];
  const keys: string[] = [];
  items.forEach((item, i) => {
    if (item.kind === 'declic') {
      screens.push(quizScreen(item.question, i));
      keys.push(item.key);
      return;
    }
    const raw = lessons.find((l) => l.lessonId === item.lessonId)?.screens.find((s) => s.index === item.index)?.raw;
    if (!raw) return;
    screens.push(raw);
    keys.push(item.key);
  });
  return { title: 'Révision', screens, keys };
}

// Résultats d'une révision terminée, ajoutés à l'historique (date et résultat
// de chaque écran révisé)
export function recordResults(history: SeenHistory, results: readonly { key: string; correct: boolean }[], at: string): SeenHistory {
  const next = { ...history };
  for (const r of results) next[r.key] = { at, correct: r.correct, from: 'revision' };
  return next;
}

// Résultats d'une leçon terminée : premier essai de chaque écran noté
export function recordLessonResults(
  history: SeenHistory,
  lessonId: number,
  results: readonly { index: number; correct: boolean }[],
  at: string
): SeenHistory {
  const next = { ...history };
  for (const r of results) next[screenKey(lessonId, r.index)] = { at, correct: r.correct, from: 'lecon' };
  return next;
}

// Bilan de Val à la fin d'une révision
export function revisionVerdict(correct: number, total: number, dayDone: boolean): { line: string; mood: 'celebrant' | 'fier' | 'rassurant' } {
  if (dayDone) return { line: 'Journée terminée. À demain !', mood: 'celebrant' };
  if (total > 0 && correct === total) return { line: 'Sans faute. Tout est bien rangé.', mood: 'celebrant' };
  if (correct * 2 >= total) return { line: 'Bien révisé. Les autres reviendront demain.', mood: 'fier' };
  return { line: 'Ça arrive. On les revoit très vite.', mood: 'rassurant' };
}
