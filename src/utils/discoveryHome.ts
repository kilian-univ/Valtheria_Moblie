// Accueil d'Apprendre sans compte : grande carte de la leçon de l'objectif,
// série et XP comptés sur le téléphone, feuille « Un autre sujet », carte du
// compte. Fonctions pures, sans React : testables avec Node.

import { DISCOVERY, discoveryPlan, OBJECTIVE_OPTIONS, type Objective, universeName } from '../lesson/discovery';
import type { Universe } from '../lesson/model';

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

export type HomeCardState = 'terminee' | 'commencee' | 'jamais';
export type HomeCardAction = 'autre-sujet' | 'creer-compte' | 'reprendre' | 'commencer';

export type HomeCard = {
  objective: Objective;
  state: HomeCardState;
  badge: string;
  title: string;
  text: string;
  // Bouton ivoire de la carte
  action: HomeCardAction;
  actionLabel: string;
  // « Un autre sujet » en bouton texte sous la carte, sinon null
  secondary: 'autre-sujet' | null;
};

export function homeCardState(objective: Objective, started: readonly Objective[], played: readonly Objective[]): HomeCardState {
  if (played.includes(objective)) return 'terminee';
  return started.includes(objective) ? 'commencee' : 'jamais';
}

// Carte de la leçon de l'objectif choisi (sans objectif : « Je découvre »).
// Leçon terminée : la suite dans l'univers, et un autre sujet ; inscription
// ouverte, le bouton de la carte crée le compte et « Un autre sujet » passe
// dessous. Pas terminée : reprendre ou commencer, « Un autre sujet » dessous
// pour que toutes les leçons restent à portée.
export function homeCard(input: {
  objective: Objective | null;
  started: readonly Objective[];
  played: readonly Objective[];
  signupClosed: boolean;
  universes?: readonly Universe[];
}): HomeCard {
  const objective = input.objective ?? 'decouvrir';
  const state = homeCardState(objective, input.started, input.played);
  const title = lessonTitle(objective);
  if (state === 'terminee') {
    const register = !input.signupClosed;
    return {
      objective,
      state,
      badge: 'LEÇON TERMINÉE',
      title,
      text: `La suite t’attend dans l’univers ${universeName(discoveryPlan(objective), input.universes)}.`,
      action: register ? 'creer-compte' : 'autre-sujet',
      actionLabel: register ? 'CRÉER MON COMPTE' : 'UN AUTRE SUJET',
      secondary: register ? 'autre-sujet' : null,
    };
  }
  return {
    objective,
    state,
    badge: 'POUR TOI, 1 MIN',
    title,
    text: lessonHook(objective),
    action: state === 'commencee' ? 'reprendre' : 'commencer',
    actionLabel: state === 'commencee' ? 'REPRENDRE' : 'COMMENCER',
    secondary: 'autre-sujet',
  };
}

// ---------------------------------------------------------------------------
// Série et XP, comptés sur le téléphone
// ---------------------------------------------------------------------------

// Jour local « AAAA-MM-JJ »
export function localDay(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// Leçon terminée aujourd'hui : le jour est ajouté (une seule fois, 60 jours gardés)
export function withLessonDay(days: readonly string[], date: Date = new Date()): string[] {
  const day = localDay(date);
  return [...new Set([...days, day])].sort().slice(-60);
}

export function doneToday(days: readonly string[], now: Date = new Date()): boolean {
  return days.includes(localDay(now));
}

// Jours d'affilée jusqu'à aujourd'hui, ou jusqu'à hier si la leçon du jour
// n'est pas encore faite (la série tient jusqu'à minuit)
export function discoveryStreak(days: readonly string[], now: Date = new Date()): number {
  const set = new Set(days);
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!set.has(localDay(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (set.has(localDay(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

// XP des leçons découvertes : une fois par leçon
export function discoveryXp(played: readonly Objective[]): number {
  return played.length * DISCOVERY_XP;
}

// « 1 jour », « 3 jours »
export function daysLabel(n: number): string {
  return `${n} ${n > 1 ? 'jours' : 'jour'}`;
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

export function guestSubtitle(lessonDoneToday: boolean): string {
  return lessonDoneToday ? 'Reviens demain pour garder ta série.' : 'Une minute pour comprendre l’argent.';
}

// Titre de la fin de leçon : le prénom s'il existe
export function endTitle(firstName: string, firstLesson: boolean): string {
  const name = firstName.trim();
  if (name) return `Bravo, ${name} !`;
  return firstLesson ? 'Première leçon terminée !' : 'Leçon terminée !';
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
        text: 'En attendant, toutes les leçons sont à toi.',
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
