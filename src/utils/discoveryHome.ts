// Accueil d'Apprendre sans compte : grande carte de la leçon de l'objectif,
// série et XP comptés sur le téléphone, flamme, feuille « Un autre sujet »,
// carte du compte, célébration des six leçons. Fonctions pures, sans React : testables avec Node.

import { DISCOVERY, discoveryPlan, OBJECTIVE_OPTIONS, OBJECTIVES, type Objective, universeName } from '../lesson/discovery';
import type { Universe } from '../lesson/model';
import { localDay } from './day';
import { withPlayed, type OnboardingState } from './onboarding';
import { daysLabel, medalToCelebrate, simulateStreak, type Medal } from './streakRewards';

export { daysLabel, localDay };
export { weekDays, type WeekDay } from './streakRewards';

// XP d'une leçon découverte (comme le crédit envoyé à l'inscription)
export const DISCOVERY_XP = 20;

export type DiscoveryTile = {
  objective: Objective;
  // Titre de la leçon (« L'argent qui fond »)
  title: string;
  // Sujet court (« Épargner »)
  subject: string;
  icon: string;
  // Univers conseillé : donne la couleur de la pastille
  universeSlug: string;
  // Objectif choisi à la première ouverture
  forYou: boolean;
  // Déjà jouée : pastille dorée cochée
  played: boolean;
};

function lessonText(objective: Objective, field: 'title' | 'hook'): string {
  const lesson = DISCOVERY[objective].lesson as Record<string, unknown>;
  return typeof lesson[field] === 'string' ? (lesson[field] as string) : '';
}

export function lessonTitle(objective: Objective): string {
  return lessonText(objective, 'title');
}

// Phrase d'accroche de la leçon (« Pourquoi l'argent qui dort perd de la valeur »)
export function lessonHook(objective: Objective): string {
  return lessonText(objective, 'hook');
}

// Les six leçons dans l'ordre du document (feuille « Un autre sujet »)
export function discoveryTiles(chosen: Objective | null, played: readonly Objective[]): DiscoveryTile[] {
  return OBJECTIVE_OPTIONS.map((o) => ({
    objective: o.value,
    title: lessonTitle(o.value),
    subject: o.subject,
    icon: o.icon,
    universeSlug: DISCOVERY[o.value].universe.slug,
    forYou: o.value === chosen,
    played: played.includes(o.value),
  }));
}

// ---------------------------------------------------------------------------
// Grande carte de l'accueil
// ---------------------------------------------------------------------------

export type HomeCardState = 'terminee' | 'commencee' | 'jamais' | 'six';
export type HomeCardAction = 'autre-sujet' | 'creer-compte' | 'reprendre' | 'commencer' | 'rejouer';

export type HomeCard = {
  objective: Objective;
  state: HomeCardState;
  badge: string;
  title: string;
  text: string;
  // Leçon terminée, d'autres restantes : « Encore 3 sujets à découvrir. » et
  // les six pastilles (or : faite), sinon null
  progress: { line: string; dots: boolean[] } | null;
  // Bouton ivoire de la carte
  action: HomeCardAction;
  actionLabel: string;
  // Bouton texte sous la carte (ouvre la feuille des leçons), sinon null
  secondary: { action: 'autre-sujet'; label: string } | null;
};

// Leçons découvertes faites, dans l'ordre du document (pastilles)
export function topicDots(played: readonly Objective[]): boolean[] {
  return OBJECTIVES.map((o) => played.includes(o));
}

export function remainingTopics(played: readonly Objective[]): number {
  return OBJECTIVES.filter((o) => !played.includes(o)).length;
}

export function allTopicsDone(played: readonly Objective[]): boolean {
  return remainingTopics(played) === 0;
}

// « Encore 1 sujet à découvrir. », « Encore 4 sujets à découvrir. »
export function remainingLabel(n: number): string {
  return `Encore ${n} ${n > 1 ? 'sujets' : 'sujet'} à découvrir.`;
}

export function homeCardState(objective: Objective, started: readonly Objective[], played: readonly Objective[]): HomeCardState {
  if (allTopicsDone(played)) return 'six';
  if (played.includes(objective)) return 'terminee';
  return started.includes(objective) ? 'commencee' : 'jamais';
}

// Carte de la leçon de l'objectif choisi (sans objectif : « Je découvre »).
// - Six leçons faites : carte dorée « Tu as fait le tour ! ».
// - Leçon terminée : la suite dans l'univers, les sujets restants.
// - Pas terminée : reprendre ou commencer.
// Inscription ouverte et leçon terminée (ou six) : le bouton de la carte crée
// le compte et les leçons passent en bouton texte dessous.
export function homeCard(input: {
  objective: Objective | null;
  started: readonly Objective[];
  played: readonly Objective[];
  signupClosed: boolean;
  universes?: readonly Universe[];
}): HomeCard {
  const objective = input.objective ?? 'decouvrir';
  const state = homeCardState(objective, input.started, input.played);
  const register = !input.signupClosed;
  const title = lessonTitle(objective);
  const otherTopic = { action: 'autre-sujet' as const, label: 'Un autre sujet' };

  if (state === 'six') {
    return {
      objective,
      state,
      badge: '6 SUR 6',
      title: 'Tu as fait le tour !',
      text: register
        ? 'Six sujets, six déclics. Crée ton compte pour débloquer les vrais modules.'
        : 'Six sujets, six déclics. La suite, ce sont les vrais modules : ils t’attendent dès l’ouverture des inscriptions.',
      progress: null,
      action: register ? 'creer-compte' : 'rejouer',
      actionLabel: register ? 'CRÉER MON COMPTE' : 'REJOUER UNE LEÇON',
      secondary: register ? { action: 'autre-sujet', label: 'Rejouer une leçon' } : null,
    };
  }
  if (state === 'terminee') {
    return {
      objective,
      state,
      badge: 'LEÇON TERMINÉE',
      title,
      text: `La suite t’attend dans l’univers ${universeName(discoveryPlan(objective), input.universes)}.`,
      progress: { line: remainingLabel(remainingTopics(input.played)), dots: topicDots(input.played) },
      action: register ? 'creer-compte' : 'autre-sujet',
      actionLabel: register ? 'CRÉER MON COMPTE' : 'UN AUTRE SUJET',
      secondary: register ? otherTopic : null,
    };
  }
  return {
    objective,
    state,
    badge: 'POUR TOI, 1 MIN',
    title,
    text: lessonHook(objective),
    progress: null,
    action: state === 'commencee' ? 'reprendre' : 'commencer',
    actionLabel: state === 'commencee' ? 'REPRENDRE' : 'COMMENCER',
    secondary: otherTopic,
  };
}

// Carte du compte en bas de l'accueil : inutile quand la grande carte porte
// déjà « CRÉER MON COMPTE »
export function showAccountCard(card: HomeCard, signupClosed: boolean): boolean {
  return signupClosed || card.action !== 'creer-compte';
}

// ---------------------------------------------------------------------------
// Série et XP, comptés sur le téléphone
// ---------------------------------------------------------------------------

// Leçon terminée aujourd'hui : le jour est ajouté (une seule fois). 400 jours
// gardés : de quoi rejouer une série de 100 jours et plus, gels compris.
export const LESSON_DAYS_KEPT = 400;

export function withLessonDay(days: readonly string[], date: Date = new Date()): string[] {
  const day = localDay(date);
  return [...new Set([...days, day])].sort().slice(-LESSON_DAYS_KEPT);
}

export function doneToday(days: readonly string[], now: Date = new Date()): boolean {
  return days.includes(localDay(now));
}

// Jours d'affilée jusqu'à aujourd'hui, ou jusqu'à hier si la leçon du jour
// n'est pas encore faite (la série tient jusqu'à minuit) ; un jour manqué est
// sauvé par un gel s'il en reste (streakRewards.ts)
export function discoveryStreak(days: readonly string[], now: Date = new Date()): number {
  return simulateStreak(days, now).streak;
}

// XP des leçons découvertes : une fois par leçon
export function discoveryXp(played: readonly Objective[]): number {
  return played.length * DISCOVERY_XP;
}

// XP gagnés par cette leçon : 20 la première fois, 0 en la rejouant
export function discoveryXpGain(played: readonly Objective[], objective: Objective | null): number {
  return objective && !played.includes(objective) ? DISCOVERY_XP : 0;
}


// ---------------------------------------------------------------------------
// Flamme de série
// ---------------------------------------------------------------------------

export type FlameTier = {
  // 0 éteinte ; 1 petite (1 à 2 jours) ; 2 lueur (3 à 6) ; 3 étincelles
  // (7 à 29) ; 4 brasier (30 et plus)
  level: 0 | 1 | 2 | 3 | 4;
  // Taille relative à la taille demandée
  scale: number;
  // Lueur dorée qui respire derrière
  glow: boolean;
  // Halo doré permanent
  halo: boolean;
  // Étincelles qui s'échappent : délai moyen entre deux (ms), null : aucune
  sparkEvery: number | null;
};

export function flameTier(days: number): FlameTier {
  if (days <= 0) return { level: 0, scale: 0.88, glow: false, halo: false, sparkEvery: null };
  if (days <= 2) return { level: 1, scale: 0.88, glow: false, halo: false, sparkEvery: null };
  if (days <= 6) return { level: 2, scale: 0.94, glow: true, halo: false, sparkEvery: null };
  if (days <= 29) return { level: 3, scale: 1, glow: true, halo: false, sparkEvery: 3200 };
  return { level: 4, scale: 1, glow: true, halo: true, sparkEvery: 1300 };
}

// Allumage de la flamme : à sa première apparition de la journée seulement
export function shouldIgnite(lastIgnitedDay: string | null, now: Date = new Date()): boolean {
  return lastIgnitedDay !== localDay(now);
}

// ---------------------------------------------------------------------------
// Leçon découverte terminée
// ---------------------------------------------------------------------------

export type LessonDone = {
  // À mémoriser : leçons jouées, jour de série, célébrations (montrées une
  // fois), meilleure série
  patch: Pick<OnboardingState, 'played' | 'lessonDays' | 'sixCelebrated' | 'bestStreak' | 'celebratedMedals'>;
  // Série avant et après (fin de leçon : la flamme grandit si elle augmente)
  streakFrom: number;
  streakTo: number;
  // Cette leçon complète les six, et la célébration n'a jamais été montrée
  celebrateSix: boolean;
  // Palier de série franchi par cette leçon, jamais fêté, sinon null
  medal: Medal | null;
  // Cette leçon fait gagner un gel de série
  freezeGained: boolean;
  // XP gagnés par cette leçon (bilan de fin)
  xpGained: number;
};

export function recordLessonDone(
  state: Pick<OnboardingState, 'played' | 'lessonDays' | 'sixCelebrated' | 'bestStreak' | 'celebratedMedals'>,
  objective: Objective | null,
  now: Date = new Date()
): LessonDone {
  const played = objective ? withPlayed(state.played, objective) : state.played;
  const lessonDays = withLessonDay(state.lessonDays, now);
  const celebrateSix = !state.sixCelebrated && !allTopicsDone(state.played) && allTopicsDone(played);
  const before = simulateStreak(state.lessonDays, now);
  const after = simulateStreak(lessonDays, now);
  const { medal, crossed } = medalToCelebrate(before.streak, after.streak, state.celebratedMedals);
  return {
    patch: {
      played,
      lessonDays,
      sixCelebrated: state.sixCelebrated || celebrateSix,
      bestStreak: Math.max(state.bestStreak, after.best),
      celebratedMedals: [...new Set([...state.celebratedMedals, ...crossed])].sort((a, b) => a - b),
    },
    streakFrom: before.streak,
    streakTo: after.streak,
    celebrateSix,
    medal,
    freezeGained: after.freezeGainDays.includes(localDay(now)) && !before.freezeGainDays.includes(localDay(now)),
    xpGained: discoveryXpGain(state.played, objective),
  };
}

// ---------------------------------------------------------------------------
// Textes de l'accueil
// ---------------------------------------------------------------------------

// « Bonjour » de 5 h à 18 h, « Bonsoir » sinon (comme l'accueil connecté),
// suivi du prénom s'il existe
export function guestTitle(firstName: string, date: Date = new Date()): string {
  const hour = date.getHours();
  const hello = hour >= 5 && hour < 18 ? 'Bonjour' : 'Bonsoir';
  const name = firstName.trim();
  return name ? `${hello}, ${name}` : hello;
}

// Sous-titre de l'accueil : six sujets faits ; une leçon terminée
// aujourd'hui (celle de la carte ou une autre) ; sinon l'invitation
export function guestSubtitle(input: { allDone: boolean; doneToday: boolean }): string {
  if (input.allDone) return 'Tu as découvert les six sujets.';
  return input.doneToday ? 'Reviens demain pour garder ta série.' : 'Une minute pour comprendre l’argent.';
}


// Bulle de Val à l'étape de l'objectif
export function objectiveValLine(firstName: string): string {
  const name = firstName.trim();
  return name ? `Enchanté, ${name} ! Qu’est-ce qui t’amène ?` : 'Enchanté ! Qu’est-ce qui t’amène ?';
}

export type AccountCard =
  | { kind: 'open'; title: string; text: string; action: 'register'; actionLabel: string }
  | { kind: 'closed'; title: string; text: string; action: 'login'; actionLabel: string };

// Carte compacte du compte, en bas de l'accueil
export function accountCard(signupClosed: boolean): AccountCard {
  return signupClosed
    ? {
        kind: 'closed',
        title: 'Les inscriptions ouvrent très bientôt',
        text: 'En attendant, les six leçons découvertes sont à toi.',
        action: 'login',
        actionLabel: 'Se connecter',
      }
    : {
        kind: 'open',
        title: 'Garde ta progression',
        text: 'Crée ton compte pour garder tes leçons et ta série.',
        action: 'register',
        actionLabel: 'Créer mon compte',
      };
}

// Fin de leçon sans compte : inscription ouverte → créer le compte ;
// fermée → « Me rappeler demain » (sauf rappel déjà actif) et « Plus tard »
export type EndActions =
  | { kind: 'register' }
  | { kind: 'reminder' }
  | { kind: 'home' };

export function endActions(signupClosed: boolean, reminderEnabled: boolean): EndActions {
  if (!signupClosed) return { kind: 'register' };
  return reminderEnabled ? { kind: 'home' } : { kind: 'reminder' };
}
