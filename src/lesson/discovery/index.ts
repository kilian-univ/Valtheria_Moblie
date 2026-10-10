// Leçons découvertes de la première ouverture, une par objectif. Fonctions
// et données pures, sans React : testables avec Node.
//
// ⚠ EN ATTENTE DU DOCUMENT « lecons-decouvertes.md » : seule la leçon
// « comprendre » (celle de la maquette) est écrite. Les cinq autres objectifs
// la jouent en attendant, et leur univers conseillé, leur prochaine leçon et
// la phrase de Val sont provisoires (PENDING ci-dessous). À remplacer par le
// document, qui sera recopié dans ce dossier.

import type { LessonModel } from '../model';
import { normalizeLesson } from '../normalize';
import { comprendre } from './comprendre';

export const OBJECTIVES = ['comprendre', 'epargner', 'investir', 'projet', 'rouge', 'decouvrir'] as const;
export type Objective = (typeof OBJECTIVES)[number];

export function isObjective(value: unknown): value is Objective {
  return typeof value === 'string' && (OBJECTIVES as readonly string[]).includes(value);
}

// Options de l'écran « Qu'est-ce qui t'amène ? », dans l'ordre de la maquette.
// icon : nom Ionicons (contour).
export const OBJECTIVE_OPTIONS: readonly { value: Objective; label: string; icon: string }[] = [
  { value: 'comprendre', label: 'Comprendre où part mon argent', icon: 'pie-chart-outline' },
  { value: 'epargner', label: 'Mettre de l’argent de côté', icon: 'wallet-outline' },
  { value: 'investir', label: 'Commencer à investir', icon: 'trending-up-outline' },
  { value: 'projet', label: 'Préparer un projet', icon: 'flag-outline' },
  { value: 'rouge', label: 'Ne plus finir le mois dans le rouge', icon: 'help-buoy-outline' },
  { value: 'decouvrir', label: 'Je découvre, on verra', icon: 'compass-outline' },
];

export type DiscoveryPlan = {
  // Leçon au format du serveur (GET /lessons/{id})
  lesson: unknown;
  // Univers conseillé (slug et nom du serveur)
  universe: { slug: string; name: string };
  // Première leçon du module conseillé, sur la carte « PROCHAINE LEÇON »
  nextLessonTitle: string;
  // Réaction de Val sur l'écran du pseudo, qui nomme l'univers conseillé
  valLine: string;
  // Contenu provisoire, en attendant le document
  pending: boolean;
};

const PAIE = { slug: 'paie-primes-et-aides', name: 'Paie, primes et aides' };

// Seule « comprendre » vient de la maquette ; les autres reprennent sa leçon
// en attendant le document (pending).
export const DISCOVERY: Record<Objective, DiscoveryPlan> = {
  comprendre: {
    lesson: comprendre,
    universe: PAIE,
    nextLessonTitle: 'Ce que ta fiche de paie ne te dit pas',
    valLine: 'Savoir où part ton argent, bonne idée : on commencera par l’univers Paie, primes et aides. Moi, c’est Val. Et toi ?',
    pending: false,
  },
  epargner: {
    lesson: comprendre,
    // Univers et phrase de Val : maquette (Inscription-2-pseudo) ; leçon et
    // prochaine leçon : en attente du document
    universe: { slug: 'avant-d-investir', name: 'Avant d’investir' },
    nextLessonTitle: 'Ce que ta fiche de paie ne te dit pas',
    valLine: 'Mettre de côté, bonne idée : on commencera par l’univers Avant d’investir. Moi, c’est Val. Et toi ?',
    pending: true,
  },
  investir: {
    lesson: comprendre,
    universe: PAIE,
    nextLessonTitle: 'Ce que ta fiche de paie ne te dit pas',
    valLine: 'Investir, bonne idée : on commencera par l’univers Paie, primes et aides. Moi, c’est Val. Et toi ?',
    pending: true,
  },
  projet: {
    lesson: comprendre,
    universe: PAIE,
    nextLessonTitle: 'Ce que ta fiche de paie ne te dit pas',
    valLine: 'Préparer un projet, bonne idée : on commencera par l’univers Paie, primes et aides. Moi, c’est Val. Et toi ?',
    pending: true,
  },
  rouge: {
    lesson: comprendre,
    universe: PAIE,
    nextLessonTitle: 'Ce que ta fiche de paie ne te dit pas',
    valLine: 'Finir le mois sereinement, c’est possible : on commencera par l’univers Paie, primes et aides. Moi, c’est Val. Et toi ?',
    pending: true,
  },
  decouvrir: {
    lesson: comprendre,
    universe: PAIE,
    nextLessonTitle: 'Ce que ta fiche de paie ne te dit pas',
    valLine: 'Tu découvres ? Parfait : on commencera par l’univers Paie, primes et aides. Moi, c’est Val. Et toi ?',
    pending: true,
  },
};

export function discoveryPlan(objective: Objective | null | undefined): DiscoveryPlan {
  return DISCOVERY[isObjective(objective) ? objective : 'decouvrir'];
}

// Leçon prête pour le lecteur
export function discoveryLesson(objective: Objective | null | undefined): LessonModel {
  return normalizeLesson(discoveryPlan(objective).lesson);
}
