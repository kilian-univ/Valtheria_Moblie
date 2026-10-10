// Calculs du lecteur de leçon. Fonctions pures, sans React : testables avec
// Node. Le format envoyé à /complete est construit ici (buildResponses) et ne
// doit pas changer.

import type { CollectedAnswer } from '@/src/components/apprendre/types';
import type { Module } from '@/src/context/ApiContext';
import type { LessonScreen } from '@/src/lesson/model';
import { parseNumber } from './grade';

type Screen = LessonScreen;

// ---------------------------------------------------------------------------
// Réponses
// ---------------------------------------------------------------------------

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
  return screen.kind !== 'unsupported' && screen.kind !== 'reveal' && screen.kind !== 'simulator';
}

// Écran non noté : « Continuer » est-il actif ? Le simulateur attend que le
// curseur ait bougé (il signale alors une réponse en cours).
export function canContinue(screen: Screen | undefined, hasDraft: boolean): boolean {
  return screen?.kind === 'simulator' ? hasDraft : true;
}

// Consigne sous un bouton Valider inactif
export function validateHint(screen: Screen | undefined): string {
  switch (screen?.kind) {
    case 'true_false':
      return 'Réponds à toutes les cartes.';
    case 'match':
      return 'Relie toutes les paires.';
    case 'dialogue':
      return 'Choisis ta réponse.';
    default:
      return 'Choisis une réponse pour valider.';
  }
}

// Estimation donnée sur l'écran désigné par from_screen (slider ou number
// précédent), pour la rappeler sur une révélation. null si aucune.
export function estimateFor(screens: Screen[], answers: CollectedAnswer[], index: number): number | null {
  const screen = screens[index];
  if (!screen || screen.kind !== 'reveal' || screen.fromScreen === null) return null;
  const from = screen.fromScreen;
  if (from < 0 || from >= index) return null;
  const target = screens[from];
  const type = target.kind === 'unsupported' ? target.type : target.kind;
  if (type !== 'slider' && type !== 'number') return null;
  const first = answers.find((a) => a.screenIndex === from);
  return first ? parseNumber(first.raw) : null;
}

// Phrase sous le vrai chiffre, selon l'écart avec l'estimation
export function estimateSentence(guess: number, actual: number): string {
  if (guess === actual) return 'Pile dans le mille.';
  const gap = Math.abs(guess - actual) / Math.max(Math.abs(actual), 1e-9);
  if (gap <= 0.1) return 'Tout près.';
  if (guess < actual) return gap <= 0.5 ? 'Un peu plus que tu pensais.' : 'Bien plus que tu pensais.';
  return gap <= 0.5 ? 'Un peu moins que tu pensais.' : 'Bien moins que tu pensais.';
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
  surprise_chest?: { amount?: number } | null;
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

export type EndStep = 'done' | 'streak' | 'chest' | 'surprise' | 'module';

// Écrans de fin, dans l'ordre, sans ceux qui ne s'appliquent pas
export function endSteps(result: LessonResult, streakBefore: number | null): EndStep[] {
  const steps: EndStep[] = ['done'];
  if (streakGain(streakBefore, result.user?.streak)) steps.push('streak');
  // Un coffre vide (rejeu sans progrès : amount 0) ne s'ouvre pas
  if (positiveAmount(result.chest?.amount) > 0) steps.push('chest');
  if (positiveAmount(result.surprise_chest?.amount) > 0) steps.push('surprise');
  if (result.module_just_completed) steps.push('module');
  return steps;
}

export function totalVals(result: LessonResult): number {
  return (result.vals_gained ?? 0) + (result.daily_streak_bonus ?? 0);
}

// Phrase sous « Leçon terminée ! »
export function endSentence(firstTry: number, total: number): string {
  // Nombre absent ou invalide : comme une leçon sans question notée
  if (!Number.isFinite(total) || total <= 0) return 'Bien joué, tu as fait le tour.';
  if (!Number.isFinite(firstTry)) firstTry = 0;
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

function positiveAmount(raw: unknown): number {
  return typeof raw === 'number' && Number.isFinite(raw) && raw > 0 ? raw : 0;
}

// Raretés des coffres renvoyées par /complete (ValthService::chestReward du
// site), de la plus courante à la plus rare
export const CHEST_RARITIES = ['commun', 'rare', 'epique', 'legendaire'] as const;
export type ChestRarity = (typeof CHEST_RARITIES)[number];

// Rareté inconnue ou absente : épique, comme sur le site
export function chestRarity(raw: unknown): ChestRarity {
  return typeof raw === 'string' && (CHEST_RARITIES as readonly string[]).includes(raw)
    ? (raw as ChestRarity)
    : 'epique';
}

// Suspense : le coffre passe par chaque rareté, de commun à la sienne
export function chestEvolution(rarity: ChestRarity): ChestRarity[] {
  return CHEST_RARITIES.slice(0, CHEST_RARITIES.indexOf(rarity) + 1);
}

const CHEST_LABELS: Record<ChestRarity, string> = {
  commun: 'Coffre commun',
  rare: 'Coffre rare',
  epique: 'Coffre épique',
  legendaire: 'Coffre légendaire',
};

export function chestLabel(rarity: unknown): string {
  return CHEST_LABELS[chestRarity(rarity)];
}

export function chestAmount(chest: { amount?: number } | null | undefined): number {
  return positiveAmount(chest?.amount);
}

// Titre du module terminé : celui de la réponse s'il y est, sinon celui du
// module qui contient la leçon.
export function finishedModuleTitle(result: LessonResult, modules: Module[], lessonId: number): string | null {
  const fromResult = result.module?.title;
  if (typeof fromResult === 'string' && fromResult.trim()) return fromResult;
  const module = modules.find((m) => (m.lessons ?? []).some((l) => l.id === lessonId));
  return module?.title ?? null;
}
