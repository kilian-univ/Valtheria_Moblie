// Calculs du lecteur de leçon. Fonctions pures, sans React : testables avec
// Node. Le format envoyé à /complete est construit ici (buildResponses) et ne
// doit pas changer.

import type { CollectedAnswer } from '@/src/components/apprendre/types';
import type { Module } from '@/src/context/ApiContext';
import type { LessonScreen, RevealLine, ValLine } from '@/src/lesson/model';
import { formatNumber, withUnit } from './format';
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

// Écran non noté : le bouton du bas est-il actif ? Le pari et le simulateur
// attendent que le curseur ait bougé (ils signalent alors une réponse en
// cours).
export function canContinue(screen: Screen | undefined, hasDraft: boolean): boolean {
  return screen?.kind === 'simulator' || screen?.kind === 'slider' ? hasDraft : true;
}

// Écrans sans bouton principal : la réponse part d'elle-même (dernière
// carte, dernière paire, réplique envoyée)
export function hasPrimaryButton(screen: Screen | undefined): boolean {
  return screen?.kind !== 'true_false' && screen?.kind !== 'match' && screen?.kind !== 'dialogue';
}

// Val pose la question en haut de l'écran, sauf dans un dialogue (le
// personnage y prend la parole ; Val réagit dans la feuille de réponse)
export function showsVal(screen: Screen | undefined): boolean {
  return screen?.kind !== 'dialogue';
}

// Libellé du bouton principal : « Je parie » sous un pari, « Valider » sous
// une question notée, « Continuer » ailleurs
export function primaryLabel(screen: Screen | undefined): string {
  if (screen?.kind === 'slider' && !screen.scored) return 'Je parie';
  return isGradable(screen) ? 'Valider' : 'Continuer';
}

// Réplique de Val quand l'écran n'en prévoit pas : Val pose toujours la
// question (rien ne bouge quand il réagit ensuite)
export function defaultValLine(screen: Screen, isLast: boolean): ValLine {
  switch (screen.kind) {
    case 'choice':
      return isLast
        ? { line: 'Dernière question, sans aide. Tu as tout ce qu’il faut.', mood: 'determine' }
        : { line: screen.multiple ? 'Plusieurs bonnes réponses, à toi de les trouver.' : 'À toi de jouer. Une seule bonne réponse.', mood: 'complice' };
    case 'true_false':
      return { line: 'Vrai ou faux ? Touche un bouton, ou balaie la carte.', mood: 'complice' };
    case 'order':
      return { line: 'Attrape une ligne par sa poignée pour la déplacer.', mood: 'complice' };
    case 'match':
      return { line: 'Touche un mot, puis sa définition.', mood: 'complice' };
    case 'allocate':
      return { line: 'Fais glisser les curseurs pour répartir.', mood: 'complice' };
    case 'simulator':
      return { line: 'Fais glisser le curseur et regarde ce qui change.', mood: 'complice' };
    case 'dialogue':
      return { line: 'À toi de répondre. Touche ta réponse pour l’envoyer.', mood: 'complice' };
    case 'slider':
      return { line: 'Fais glisser le curseur pour répondre.', mood: 'complice' };
    case 'document':
      return { line: 'Regarde bien ce document.', mood: 'neutre' };
    default:
      return { line: 'Regarde bien.', mood: 'neutre' };
  }
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

// Verdict d'une révélation, selon l'écart entre l'estimation et le vrai
// chiffre : pile, tout près (à 10 % près), un peu (à 50 % près) ou bien
// plus / moins. close : pile ou tout près (vibration de réussite, Val fier).
export type EstimateVerdict = { text: string; close: boolean; direction: 'exact' | 'more' | 'less' };

export function estimateVerdict(guess: number, actual: number, unit: string | null = null, decimals = 0): EstimateVerdict {
  if (guess === actual) return { text: 'Pile dans le mille', close: true, direction: 'exact' };
  const direction = guess < actual ? 'more' : 'less';
  const gap = Math.abs(guess - actual) / Math.max(Math.abs(actual), 1e-9);
  if (gap <= 0.1) {
    const away = withUnit(formatNumber(Math.abs(guess - actual), decimals), unit);
    return { text: `Tout près : tu étais à ${away}`, close: true, direction };
  }
  const much = gap > 0.5 ? 'Bien' : 'Un peu';
  return { text: `${much} ${direction === 'more' ? 'plus' : 'moins'} que tu pensais`, close: false, direction };
}

// Lignes d'une révélation qui apportent une information nouvelle : celles
// qui répètent un chiffre déjà affiché (départ, estimation, vrai chiffre)
// disparaissent. La ligne atténuée (hypothèse) reste toujours.
export function revealExtraLines(lines: RevealLine[], shown: number[]): RevealLine[] {
  return lines.filter(
    (line) => line.dim || typeof line.value !== 'number' || !shown.some((v) => Math.abs(v - (line.value as number)) < 1e-9)
  );
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

// ---------------------------------------------------------------------------
// Rattrapage et bilan
// ---------------------------------------------------------------------------

// Questions ratées au premier essai, dans l'ordre de la leçon : seulement
// les écrans notés que le lecteur sait rejouer (Valider ou réponse seule)
export function missedScreens(answers: CollectedAnswer[], screens: Screen[]): number[] {
  return firstAttempts(answers, screens)
    .filter((a) => !a.correct && isGradable(screens[a.screenIndex]))
    .map((a) => a.screenIndex)
    .sort((x, y) => x - y);
}

export type LessonSummary = {
  // Bonnes réponses du premier coup, sur les questions notées
  correct: number;
  total: number;
  // Questions ratées puis réussies au rattrapage (compté seulement dans l'app)
  recovered: number;
};

export function lessonSummary(answers: CollectedAnswer[], screens: Screen[], recovered: number): LessonSummary {
  const firsts = firstAttempts(answers, screens);
  return { correct: firsts.filter((a) => a.correct).length, total: firsts.length, recovered: Math.max(0, recovered) };
}

// Bouton de l'écran des questions ratées : « Rattraper 2 questions »
export function catchUpButton(count: number): string {
  return count >= 2 ? `Rattraper ${count} questions` : 'Rattraper 1 question';
}

const TYPE_LABELS: Record<string, string> = {
  choice: 'Question à choix',
  true_false: 'Vrai ou faux',
  order: 'Remettre dans l’ordre',
  match: 'Associer',
  allocate: 'Répartir',
  dialogue: 'Dialogue',
  slider: 'Estimation',
  document: 'Document',
};

// Icône (Ionicons) de chaque type de question
const TYPE_ICONS: Record<string, string> = {
  choice: 'radio-button-on',
  true_false: 'checkmark-done',
  order: 'list',
  match: 'git-compare',
  allocate: 'pie-chart',
  dialogue: 'chatbubbles',
  slider: 'options',
  document: 'document-text',
};

const PREVIEW_MAX = 90;

export type MissedItem = { label: string; icon: string; text: string };

// Carte d'une question ratée : son type, son icône, le début de la question
// (à défaut : la première carte, le premier message)
export function missedItem(screen: Screen | undefined): MissedItem {
  const kind = screen?.kind ?? '';
  // « Vrai ou faux ? » ne dit rien de la question : la première affirmation
  const generic = !!screen?.question && /^vrai ou faux\s*\??$/i.test(screen.question.trim());
  const raw =
    (generic ? null : screen?.question) ??
    (screen?.kind === 'true_false' ? screen.cards[0]?.statement : null) ??
    (screen?.kind === 'dialogue' ? screen.messages[0] : null) ??
    '';
  const text = raw.length > PREVIEW_MAX ? `${raw.slice(0, PREVIEW_MAX - 1).trimEnd()}…` : raw;
  return { label: TYPE_LABELS[kind] ?? 'Question', icon: TYPE_ICONS[kind] ?? 'help-circle', text };
}

// Nom fêté au bilan et au coffre : le pseudo du compte d'abord, puis le
// prénom mémorisé sur le téléphone ; null : titre neutre
export function celebrationName(pseudo: unknown, firstName: unknown): string | null {
  for (const raw of [pseudo, firstName]) {
    if (typeof raw === 'string' && raw.trim()) return raw.trim();
  }
  return null;
}

// Précision du bilan : part des bonnes réponses du premier coup, arrondie
export function precisionPercent(correct: number, total: number): number {
  if (!(total > 0)) return 0;
  return Math.round((Math.max(0, Math.min(correct, total)) / total) * 100);
}

// « 4 sur 5 », « 4 sur 5, 1 rattrapée »
export function precisionCaption(correct: number, total: number, recovered: number): string {
  const extra = recovered > 0 ? `, ${recovered} ${recovered >= 2 ? 'rattrapées' : 'rattrapée'}` : '';
  return `${correct} sur ${total}${extra}`;
}

// « jour d'affilée », « jours d'affilée »
export function streakDaysCaption(days: number): string {
  return days >= 2 ? 'jours d’affilée' : 'jour d’affilée';
}



// La pastille d'affilée (éclair et nombre) s'affiche à partir de 3
export const RUN_MIN = 3;

// Nombre affiché dans la pastille, ou null tant que la série est trop courte
export function runBadge(run: number): number | null {
  return Number.isFinite(run) && run >= RUN_MIN ? run : null;
}

// Lu par le lecteur d'écran
export function runAccessibilityLabel(run: number): string {
  return `${run} bonnes réponses d’affilée`;
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
  user?: { xp?: number; streak?: number; vals?: number };
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
