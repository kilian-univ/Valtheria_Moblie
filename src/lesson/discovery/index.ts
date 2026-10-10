// Leçons découvertes de la première ouverture, une par objectif. Fonctions
// et données pures, sans React : testables avec Node.
//
// Référence : lecons-decouvertes.md, dans ce dossier (leçons, univers
// conseillé et prochaine leçon par objectif). Les tests vérifient que les
// leçons en reprennent les chiffres.

import type { Module } from '@/src/context/ApiContext';
import type { LessonModel, Universe } from '../model';
import { normalizeLesson } from '../normalize';
import { comprendre } from './comprendre';
import { decouvrir } from './decouvrir';
import { epargner } from './epargner';
import { investir } from './investir';
import { projet } from './projet';
import { rouge } from './rouge';

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
  // Titre fixé par le document pour la carte « PROCHAINE LEÇON » ; null :
  // la première leçon de l'univers conseillé (nextLessonTitle)
  nextLesson: string | null;
  // Réaction de Val sur l'écran du pseudo, qui nomme l'univers conseillé
  valLine: string;
};

const GARDER_LA_MAIN = { slug: 'garder-la-main', name: 'Garder la main sur son argent' };
const AVANT_D_INVESTIR = { slug: 'avant-d-investir', name: 'Avant d’investir' };
const BOURSE = { slug: 'bourse', name: 'Bourse' };
const PAIE = { slug: 'paie-primes-et-aides', name: 'Paie, primes et aides' };

// Tableau « Après la leçon » du document
export const DISCOVERY: Record<Objective, DiscoveryPlan> = {
  comprendre: {
    lesson: comprendre,
    universe: GARDER_LA_MAIN,
    nextLesson: null,
    valLine:
      'Savoir où file ton argent, c’est déjà reprendre la main : on commence par l’univers Garder la main sur son argent. Moi, c’est Val. Et toi ?',
  },
  epargner: {
    lesson: epargner,
    universe: AVANT_D_INVESTIR,
    nextLesson: 'Le mois où tout tombe en même temps',
    valLine: 'Mettre de côté, bonne idée : on commence par l’univers Avant d’investir. Moi, c’est Val. Et toi ?',
  },
  investir: {
    lesson: investir,
    universe: BOURSE,
    nextLesson: null,
    valLine: 'Faire travailler ton argent, ça s’apprend vite : on commence par l’univers Bourse. Moi, c’est Val. Et toi ?',
  },
  projet: {
    lesson: projet,
    universe: GARDER_LA_MAIN,
    nextLesson: null,
    valLine:
      'Un projet en tête ? On le rend possible en commençant par l’univers Garder la main sur son argent. Moi, c’est Val. Et toi ?',
  },
  rouge: {
    lesson: rouge,
    universe: GARDER_LA_MAIN,
    nextLesson: null,
    valLine:
      'Fini les fins de mois à découvert : on commence par l’univers Garder la main sur son argent. Moi, c’est Val. Et toi ?',
  },
  decouvrir: {
    lesson: decouvrir,
    universe: PAIE,
    nextLesson: null,
    valLine: 'Tu découvres ? Parfait : on commence par l’univers Paie, primes et aides. Moi, c’est Val. Et toi ?',
  },
};

export function discoveryPlan(objective: Objective | null | undefined): DiscoveryPlan {
  return DISCOVERY[isObjective(objective) ? objective : 'decouvrir'];
}

// Leçon prête pour le lecteur
export function discoveryLesson(objective: Objective | null | undefined): LessonModel {
  return normalizeLesson(discoveryPlan(objective).lesson);
}

function firstLessonTitle(module: Module | undefined): string | null {
  const title = module?.lessons?.[0]?.title;
  return typeof title === 'string' && title.trim() !== '' ? title.trim() : null;
}

// Titre de la carte « PROCHAINE LEÇON » : celui du document s'il est fixé,
// sinon la première leçon du premier module publié de l'univers conseillé,
// à défaut celle du premier module disponible. null : rien de chargé.
export function nextLessonTitle(plan: DiscoveryPlan, universes: Universe[], modules: Module[]): string | null {
  if (plan.nextLesson) return plan.nextLesson;
  const universe = universes.find((u) => u.slug === plan.universe.slug);
  const own = (universe?.moduleIds ?? [])
    .map((id) => modules.find((m) => m.id === id))
    .find((m) => firstLessonTitle(m) !== null);
  return firstLessonTitle(own) ?? firstLessonTitle(modules.find((m) => firstLessonTitle(m) !== null));
}
