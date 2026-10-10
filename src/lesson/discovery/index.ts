// Leçons découvertes de la première ouverture, une par objectif. Fonctions
// et données pures, sans React : testables avec Node.
//
// Référence : lecons-decouvertes.md, dans ce dossier (version 2 : leçons de
// 5 écrans, univers conseillé par objectif). Les tests vérifient que les
// leçons en reprennent les textes et les chiffres.

import type { Module } from '@/src/context/ApiContext';
import type { LessonModel, Universe } from '../model';
import { normalizeLesson } from '../normalize';
import { crypto } from './crypto';
import { decouvrir } from './decouvrir';
import { epargner } from './epargner';
import { impots } from './impots';
import { investir } from './investir';
import { logement } from './logement';

export const OBJECTIVES = ['epargner', 'investir', 'crypto', 'logement', 'impots', 'decouvrir'] as const;
export type Objective = (typeof OBJECTIVES)[number];

export function isObjective(value: unknown): value is Objective {
  return typeof value === 'string' && (OBJECTIVES as readonly string[]).includes(value);
}

// Objectifs de la première version, encore mémorisés sur des téléphones :
// traduits vers le plus proche
export const LEGACY_OBJECTIVES: Readonly<Record<string, Objective>> = {
  comprendre: 'epargner',
  rouge: 'epargner',
  projet: 'logement',
};

// Objectif relu (téléphone, serveur) : actuel, ancien traduit, sinon null
export function toObjective(value: unknown): Objective | null {
  if (isObjective(value)) return value;
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(LEGACY_OBJECTIVES, value) ? LEGACY_OBJECTIVES[value] : null;
}

// Options de l'écran « Qu'est-ce qui t'amène ? », dans l'ordre du document.
// icon : nom Ionicons (contour).
export const OBJECTIVE_OPTIONS: readonly { value: Objective; label: string; icon: string }[] = [
  { value: 'epargner', label: 'Mettre de l’argent de côté', icon: 'wallet-outline' },
  { value: 'investir', label: 'Commencer à investir', icon: 'trending-up-outline' },
  { value: 'crypto', label: 'Comprendre la crypto', icon: 'logo-bitcoin' },
  { value: 'logement', label: 'Acheter un jour un logement', icon: 'home-outline' },
  { value: 'impots', label: 'Payer moins d’impôts', icon: 'receipt-outline' },
  { value: 'decouvrir', label: 'Je découvre, on verra', icon: 'compass-outline' },
];

export type DiscoveryPlan = {
  // Leçon au format du serveur (GET /lessons/{id})
  lesson: unknown;
  // Univers conseillé (slug et nom du serveur)
  universe: { slug: string; name: string };
  // Réaction de Val sur l'écran du pseudo, qui nomme l'univers conseillé
  valLine: string;
};

// Tableau « Après la leçon » du document
export const DISCOVERY: Record<Objective, DiscoveryPlan> = {
  epargner: {
    lesson: epargner,
    universe: { slug: 'avant-d-investir', name: 'Avant d’investir' },
    valLine: 'Mettre de côté, bonne idée : on commence par l’univers Avant d’investir. Moi, c’est Val. Et toi ?',
  },
  investir: {
    lesson: investir,
    universe: { slug: 'bourse', name: 'Bourse' },
    valLine: 'Faire travailler ton argent, ça s’apprend vite : on commence par l’univers Bourse. Moi, c’est Val. Et toi ?',
  },
  crypto: {
    lesson: crypto,
    universe: { slug: 'crypto', name: 'Crypto' },
    valLine: 'La crypto, sans le bruit autour : on commence par l’univers Crypto. Moi, c’est Val. Et toi ?',
  },
  logement: {
    lesson: logement,
    universe: { slug: 'se-loger', name: 'Se loger' },
    valLine: 'Un logement à toi, ça se prépare : on commence par l’univers Se loger. Moi, c’est Val. Et toi ?',
  },
  impots: {
    lesson: impots,
    universe: { slug: 'impots', name: 'Impôts' },
    valLine: 'Payer le juste prix, pas un euro de plus : on commence par l’univers Impôts. Moi, c’est Val. Et toi ?',
  },
  decouvrir: {
    lesson: decouvrir,
    universe: { slug: 'paie-primes-et-aides', name: 'Paie, primes et aides' },
    valLine: 'Tu découvres ? Parfait : on commence par l’univers Paie, primes et aides. Moi, c’est Val. Et toi ?',
  },
};

export function discoveryPlan(objective: Objective | null | undefined): DiscoveryPlan {
  return DISCOVERY[toObjective(objective) ?? 'decouvrir'];
}

// Leçon prête pour le lecteur
export function discoveryLesson(objective: Objective | null | undefined): LessonModel {
  return normalizeLesson(discoveryPlan(objective).lesson);
}

function firstLessonTitle(module: Module | undefined): string | null {
  const title = module?.lessons?.[0]?.title;
  return typeof title === 'string' && title.trim() !== '' ? title.trim() : null;
}

// Titre de la carte « PROCHAINE LEÇON » : la première leçon du premier
// module publié de l'univers conseillé, à défaut celle du premier module
// disponible. null : rien de chargé.
export function nextLessonTitle(plan: DiscoveryPlan, universes: Universe[], modules: Module[]): string | null {
  const universe = universes.find((u) => u.slug === plan.universe.slug);
  const own = (universe?.moduleIds ?? [])
    .map((id) => modules.find((m) => m.id === id))
    .find((m) => firstLessonTitle(m) !== null);
  return firstLessonTitle(own) ?? firstLessonTitle(modules.find((m) => firstLessonTitle(m) !== null));
}
