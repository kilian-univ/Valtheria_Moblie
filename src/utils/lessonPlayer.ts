// Calculs du lecteur de leçon. Fonctions pures, sans React : testables avec
// Node. Le format envoyé à /complete est construit ici (buildResponses) et ne
// doit pas changer.

import type { CollectedAnswer, Screen } from '@/src/components/apprendre/types';
import type { Module } from '@/src/context/ApiContext';

// ---------------------------------------------------------------------------
// Réponses
// ---------------------------------------------------------------------------

// Toutes les bonnes réponses, et elles seules
export function isExactSelection(selected: string[], correctIds: string[]): boolean {
  return selected.length === correctIds.length && correctIds.every((id) => selected.includes(id));
}

// Format attendu par /complete : { "<index d'écran>": [tentative1, ...] }.
// Seuls les écrans notés sont envoyés (reveal & co. n'ont pas de verdict).
export function buildResponses(answers: CollectedAnswer[], screens: Screen[]): Record<string, any[]> {
  const responses: Record<string, any[]> = {};
  answers.forEach((a) => {
    if (!screens[a.screenIndex]?.scored) return;
    const key = String(a.screenIndex);
    if (!responses[key]) responses[key] = [];
    responses[key].push(a.raw);
  });
  return responses;
}

// Écran noté dont le lecteur sait recueillir la réponse (« Valider »). Les
// autres types notés, pas encore construits, se passent avec « Continuer ».
export function isGradable(screen: Screen | undefined): boolean {
  if (!screen?.scored) return false;
  if (screen.type === 'choice') return true;
  return screen.type === 'document' && screen.payload?.mode === 'select';
}

// Première tentative de chaque écran noté, dans l'ordre où elles ont été données
function firstAttempts(answers: CollectedAnswer[], screens: Screen[]): CollectedAnswer[] {
  const seen = new Set<number>();
  const firsts: CollectedAnswer[] = [];
  for (const a of answers) {
    if (!screens[a.screenIndex]?.scored || seen.has(a.screenIndex)) continue;
    seen.add(a.screenIndex);
    firsts.push(a);
  }
  return firsts;
}

// Bonne réponse dès la première tentative sur cet écran
export function isFirstTryCorrect(answers: CollectedAnswer[], screens: Screen[], screenIndex: number): boolean {
  return firstAttempts(answers, screens).find((a) => a.screenIndex === screenIndex)?.correct ?? false;
}

// Nombre de bonnes réponses du premier coup d'affilée, en partant de la
// dernière : une erreur remet le compte à zéro.
export function firstTryRun(answers: CollectedAnswer[], screens: Screen[]): number {
  let run = 0;
  for (const a of firstAttempts(answers, screens)) {
    run = a.correct ? run + 1 : 0;
  }
  return run;
}

// La série d'affilée s'affiche à partir de 3
export const RUN_MIN = 3;

export function runLabel(run: number): string | null {
  return run >= RUN_MIN ? `${run} d’affilée !` : null;
}

// ---------------------------------------------------------------------------
// Fin de leçon
// ---------------------------------------------------------------------------

export type LessonResult = {
  xp_gained?: number;
  vals_gained?: number;
  daily_streak_bonus?: number;
  first_try_correct?: number;
  scored_total?: number;
  user?: { xp?: number; streak?: number };
  chest?: { rarity?: string; amount?: number } | null;
  module_just_completed?: boolean;
  module?: { title?: string } | null;
  [key: string]: any;
};

export type StreakGain = { from: number; to: number };

// Série de jours augmentée par la leçon. before = null : série d'avant
// inconnue (données pas encore chargées), on ne fête rien plutôt que de
// fêter à tort.
export function streakGain(before: number | null, after: number | undefined): StreakGain | null {
  if (before === null || typeof after !== 'number' || !Number.isFinite(after)) return null;
  return after > before ? { from: before, to: after } : null;
}

export type EndStep = 'done' | 'streak' | 'chest' | 'module';

// Écrans de fin, dans l'ordre, sans ceux qui ne s'appliquent pas
export function endSteps(result: LessonResult, streakBefore: number | null): EndStep[] {
  const steps: EndStep[] = ['done'];
  if (streakGain(streakBefore, result.user?.streak)) steps.push('streak');
  if (result.chest) steps.push('chest');
  if (result.module_just_completed) steps.push('module');
  return steps;
}

export function totalVals(result: LessonResult): number {
  return (result.vals_gained ?? 0) + (result.daily_streak_bonus ?? 0);
}

// Phrase sous « Leçon terminée ! »
export function endSentence(firstTry: number, total: number): string {
  if (total <= 0) return 'Bien joué, tu as fait le tour.';
  if (firstTry >= total) return 'Tout bon du premier coup. Chapeau.';
  if (firstTry === 0) return 'Pas facile, celle-là. Tu feras mieux la prochaine fois.';
  return `${firstTry} ${firstTry >= 2 ? 'bonnes réponses' : 'bonne réponse'} du premier coup sur ${total}.`;
}

export const END_BUTTON_LABELS = ['Je suis trop fort', 'Facile', 'On continue', 'Trop simple', 'Suivant !'] as const;

// rand : nombre dans [0, 1[ (Math.random par défaut)
export function pickLabel(labels: readonly string[], rand: number = Math.random()): string {
  const index = Math.min(labels.length - 1, Math.max(0, Math.floor(rand * labels.length)));
  return labels[index];
}

// "1 jour de série !", "2 jours de série !"
export function streakDaysLabel(days: number): string {
  return days >= 2 ? 'jours de série !' : 'jour de série !';
}

// Valeurs de rareté connues → libellé. Toute autre valeur est affichée telle
// quelle, première lettre en majuscule.
const RARITY_LABELS: Record<string, string> = {
  common: 'Coffre commun',
  commun: 'Coffre commun',
  rare: 'Coffre rare',
  epic: 'Coffre épique',
  epique: 'Coffre épique',
  legendary: 'Coffre légendaire',
  legendaire: 'Coffre légendaire',
};

export function chestLabel(rarity: unknown): string {
  if (typeof rarity !== 'string' || !rarity.trim()) return 'Coffre';
  const key = rarity
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
  return RARITY_LABELS[key] ?? `Coffre ${rarity.trim()}`;
}

// Titre du module terminé : celui de la réponse s'il y est, sinon celui du
// module qui contient la leçon.
export function finishedModuleTitle(result: LessonResult, modules: Module[], lessonId: number): string | null {
  const fromResult = result.module?.title;
  if (typeof fromResult === 'string' && fromResult.trim()) return fromResult;
  const module = modules.find((m) => (m.lessons ?? []).some((l) => l.id === lessonId));
  return module?.title ?? null;
}
