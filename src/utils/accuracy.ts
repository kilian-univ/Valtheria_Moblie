// Bonnes réponses d'affilée et défis de précision, sans React : testables
// avec Node.
//
// Une série d'affilée compte les bonnes réponses DU PREMIER COUP, à la
// suite ; une erreur la remet à zéro. La pastille ⚡ du lecteur apparaît à
// RUN_MIN ; à 5 et à 10, un palier fêté. Le téléphone garde, par compte (et
// sans compte), la meilleure série de chaque leçon, la meilleure de tous les
// temps et les leçons parfaites (tout juste du premier coup) ; des défis de
// précision se gagnent une seule fois.

import { RUN_MIN } from './lessonPlayer';

export { RUN_MIN };

// Paliers fêtés pendant la leçon, avec leur mot
export const RUN_MILESTONES: Record<number, string> = {
  5: 'En feu !',
  10: 'Inarrêtable !',
};

// Grand texte sous la barre, au déclenchement et aux paliers
export function runShout(run: number): string {
  return `${run}\u00A0d’affilée\u00A0!`;
}

// Réplique de Val, humeur joyeuse
export function runValLine(run: number): string {
  if (run >= 10) return `${run} d’affilée, inarrêtable !`;
  if (run >= 5) return `${run} d’affilée, tu es en feu !`;
  return `${run} d’affilée ! Continue !`;
}

// Ce qui change dans la pastille quand une réponse est validée
// - appear : la série atteint RUN_MIN (pastille qui surgit, traînée
//   d'étincelles, Val ravi, son combo, vibration de réussite) ;
// - grow : une bonne réponse de plus (le chiffre pulse) ;
// - milestone : un palier (5, 10) : gerbe d'étincelles, mot bref, célébration ;
// - break : la série se casse (la pastille s'efface, sans autre signal) ;
// - null : rien ne change à l'écran.
export type RunEvent = { kind: 'appear' | 'grow' | 'milestone' | 'break'; word: string | null } | null;

export function runEvent(before: number, after: number): RunEvent {
  if (after > before && after >= RUN_MIN) {
    if (before < RUN_MIN) return { kind: 'appear', word: null };
    if (Object.hasOwn(RUN_MILESTONES, after)) return { kind: 'milestone', word: RUN_MILESTONES[after] };
    return { kind: 'grow', word: null };
  }
  if (before >= RUN_MIN && after < RUN_MIN) return { kind: 'break', word: null };
  return null;
}

// Meilleure série d'une leçon, à partir des premiers essais dans l'ordre où
// ils ont été donnés
export function bestRunOf(results: readonly { correct: boolean }[]): number {
  let run = 0;
  let best = 0;
  for (const r of results) {
    run = r.correct ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best;
}

// Leçon parfaite : au moins une question notée, toutes justes du premier coup
export function isPerfectLesson(summary: { correct: number; total: number }): boolean {
  return summary.total > 0 && summary.correct === summary.total;
}

// ---------------------------------------------------------------------------
// Défis de précision
// ---------------------------------------------------------------------------

export type ChallengeKind = 'run' | 'perfect';

export type Challenge = {
  id: string;
  kind: ChallengeKind;
  // Série d'affilée à atteindre, ou nombre de leçons parfaites
  value: number;
  // « 10 d'affilée », « Première leçon parfaite » (espace insécable après
  // le nombre : jamais seul en fin de ligne)
  title: string;
  // Phrase sous le titre de la célébration
  line: string;
  // Sous la médaille, dans le profil
  short: string;
};

export const CHALLENGES: readonly Challenge[] = [
  { id: 'run-5', kind: 'run', value: 5, title: '5\u00A0d’affilée', line: '5 bonnes réponses du premier coup, à la suite.', short: '5 d’affilée' },
  { id: 'run-10', kind: 'run', value: 10, title: '10\u00A0d’affilée', line: '10 bonnes réponses du premier coup, à la suite.', short: '10 d’affilée' },
  { id: 'run-20', kind: 'run', value: 20, title: '20\u00A0d’affilée', line: '20 bonnes réponses du premier coup, à la suite.', short: '20 d’affilée' },
  { id: 'perfect-1', kind: 'perfect', value: 1, title: 'Première leçon parfaite', line: 'Tout juste du premier coup, sur toute une leçon.', short: '1re parfaite' },
  { id: 'perfect-10', kind: 'perfect', value: 10, title: '10\u00A0leçons parfaites', line: 'Dix leçons sans une seule erreur.', short: '10 parfaites' },
];

export type AccuracyRecord = {
  // Meilleure série de tous les temps
  bestRun: number;
  // Meilleure série de chaque leçon (clé : « l12 », « decouverte-epargner »)
  lessonBest: Record<string, number>;
  // Leçons réussies parfaitement au moins une fois (sans doublon)
  perfectLessons: string[];
  // Défis gagnés (une seule fois chacun), dans l'ordre
  earned: string[];
};

export const EMPTY_ACCURACY: AccuracyRecord = { bestRun: 0, lessonBest: {}, perfectLessons: [], earned: [] };

function isChallengeMet(c: Challenge, record: AccuracyRecord): boolean {
  return c.kind === 'run' ? record.bestRun >= c.value : record.perfectLessons.length >= c.value;
}

// Fin d'une leçon : la mémoire mise à jour et les défis gagnés à l'instant
// (jamais deux fois le même)
export function applyLesson(
  record: AccuracyRecord,
  lesson: { key: string; bestRun: number; perfect: boolean }
): { record: AccuracyRecord; gained: Challenge[] } {
  const run = Number.isFinite(lesson.bestRun) ? Math.max(0, Math.floor(lesson.bestRun)) : 0;
  const next: AccuracyRecord = {
    bestRun: Math.max(record.bestRun, run),
    lessonBest: { ...record.lessonBest, [lesson.key]: Math.max(record.lessonBest[lesson.key] ?? 0, run) },
    perfectLessons:
      lesson.perfect && !record.perfectLessons.includes(lesson.key) ? [...record.perfectLessons, lesson.key] : record.perfectLessons,
    earned: record.earned,
  };
  const gained = CHALLENGES.filter((c) => !record.earned.includes(c.id) && isChallengeMet(c, next));
  return { record: { ...next, earned: [...record.earned, ...gained.map((c) => c.id)] }, gained };
}

// Mémoire sans compte reprise par un compte : le meilleur des deux
export function mergeAccuracy(base: AccuracyRecord, extra: AccuracyRecord): AccuracyRecord {
  const lessonBest = { ...base.lessonBest };
  for (const [k, v] of Object.entries(extra.lessonBest)) lessonBest[k] = Math.max(lessonBest[k] ?? 0, v);
  return {
    bestRun: Math.max(base.bestRun, extra.bestRun),
    lessonBest,
    perfectLessons: [...new Set([...base.perfectLessons, ...extra.perfectLessons])],
    earned: [...new Set([...base.earned, ...extra.earned])],
  };
}

export function parseAccuracy(raw: unknown): AccuracyRecord {
  const r = raw && typeof raw === 'object' ? (raw as Partial<AccuracyRecord>) : {};
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, v) : 0);
  const best: Record<string, number> = {};
  if (r.lessonBest && typeof r.lessonBest === 'object') {
    for (const [k, v] of Object.entries(r.lessonBest)) best[k] = num(v);
  }
  const strings = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
  return {
    bestRun: num(r.bestRun),
    lessonBest: best,
    perfectLessons: strings(r.perfectLessons),
    earned: strings(r.earned).filter((id) => CHALLENGES.some((c) => c.id === id)),
  };
}

export function findChallenge(id: string): Challenge | null {
  return CHALLENGES.find((c) => c.id === id) ?? null;
}

// ---------------------------------------------------------------------------
// Libellés
// ---------------------------------------------------------------------------

// « Record : 7 bonnes réponses d'affilée » (« série » reste aux jours ; audit G6)
export function bestRunLine(run: number): string {
  return `Record : ${run} bonnes réponses d’affilée`;
}

// « Ton record : 12 bonnes réponses d'affilée »
export function allTimeBestLine(run: number): string {
  return `Ton record : ${run} bonnes réponses d’affilée`;
}

// « Nouveau défi : 10 d'affilée ! »
export function challengeHeadline(c: Challenge): string {
  return `Nouveau défi : ${c.title}${' '}!`;
}

// Le bilan montre la meilleure série à partir de 2 (« 1 d'affilée » ne dit rien)
export const BEST_RUN_SHOWN_FROM = 2;
