// Accueil d'Apprendre sans compte : tuiles des leçons découvertes et carte du
// compte. Fonctions pures, sans React : testables avec Node.

import { DISCOVERY, OBJECTIVE_OPTIONS, type Objective } from '../lesson/discovery';

export type DiscoveryTile = {
  objective: Objective;
  // Titre de la leçon (« L'argent qui fond »)
  title: string;
  // Sujet court (« Épargner »)
  subject: string;
  icon: string;
  // Univers conseillé : donne la couleur de la pastille
  universeSlug: string;
  // Objectif choisi à la première ouverture : en premier, « Pour toi »
  forYou: boolean;
  // Déjà jouée : pastille dorée cochée, « Rejouer »
  played: boolean;
};

function lessonTitle(objective: Objective): string {
  const lesson = DISCOVERY[objective].lesson as { title?: unknown };
  return typeof lesson.title === 'string' ? lesson.title : '';
}

// Les six leçons, l'objectif choisi en premier, puis l'ordre du document
export function discoveryTiles(chosen: Objective | null, played: readonly Objective[]): DiscoveryTile[] {
  const options = [...OBJECTIVE_OPTIONS].sort((a, b) => Number(b.value === chosen) - Number(a.value === chosen));
  return options.map((o) => ({
    objective: o.value,
    title: lessonTitle(o.value),
    subject: o.subject,
    icon: o.icon,
    universeSlug: DISCOVERY[o.value].universe.slug,
    forYou: o.value === chosen,
    played: played.includes(o.value),
  }));
}

export type AccountCard =
  | { kind: 'open'; title: string; text: string; primary: 'register'; secondary: 'login' }
  | { kind: 'closed'; title: string; text: string; primary: 'login'; secondary: null };

// Carte sous la grille, selon que l'inscription est ouverte ou fermée
export function accountCard(signupClosed: boolean): AccountCard {
  return signupClosed
    ? {
        kind: 'closed',
        title: 'Les inscriptions ouvrent très bientôt',
        text: 'En attendant, joue toutes les leçons découvertes.',
        primary: 'login',
        secondary: null,
      }
    : {
        kind: 'open',
        title: 'Garde ta progression',
        text: 'Crée ton compte pour garder tes leçons et ta série.',
        primary: 'register',
        secondary: 'login',
      };
}

// Titre de l'accueil sans compte : « Bienvenue » le jour, « Bonsoir » le soir
// (mêmes heures que le « Bonjour » de l'accueil connecté)
export function guestTitle(date: Date = new Date()): string {
  const hour = date.getHours();
  return hour >= 5 && hour < 18 ? 'Bienvenue' : 'Bonsoir';
}
