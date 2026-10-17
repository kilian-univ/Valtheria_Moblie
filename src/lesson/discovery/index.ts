// Leçons découvertes de la première ouverture, une par objectif. Fonctions
// et données pures, sans React : testables avec Node.
//
// Référence : lecons-decouvertes.md, dans ce dossier (version 2 : leçons de
// 5 écrans, univers conseillé par objectif). Les tests vérifient que les
// leçons en reprennent les textes et les chiffres.

import type { Module } from '@/src/context/ApiContext';
import { FALLBACK_FIGURES, fillFiguresDeep, type Figures } from '@/src/utils/regulatoryFigures';
import type { LessonModel, Universe } from '../model';
import { normalizeLesson } from '../normalize';
import { crypto } from './crypto';
import { decouvrir } from './decouvrir';
import { buildEpargner, epargner } from './epargner';
import { buildImpots, impots } from './impots';
import { investir } from './investir';
import { buildLogement, logement } from './logement';

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
// subject : sujet court, sur les tuiles de l'accueil sans compte
export const OBJECTIVE_OPTIONS: readonly { value: Objective; label: string; subject: string; icon: string }[] = [
  { value: 'epargner', label: 'Mettre de l’argent de côté', subject: 'Épargner', icon: 'wallet-outline' },
  { value: 'investir', label: 'Commencer à investir', subject: 'Investir', icon: 'trending-up-outline' },
  { value: 'crypto', label: 'Comprendre la crypto', subject: 'Crypto', icon: 'logo-bitcoin' },
  { value: 'logement', label: 'Acheter un jour un logement', subject: 'Logement', icon: 'home-outline' },
  { value: 'impots', label: 'Payer moins d’impôts', subject: 'Impôts', icon: 'receipt-outline' },
  { value: 'decouvrir', label: 'Je découvre, on verra', subject: 'Découvrir', icon: 'compass-outline' },
];

export type DiscoveryPlan = {
  // Leçon au format du serveur (GET /lessons/{id}), construite sur les
  // valeurs de secours des chiffres réglementaires
  lesson: unknown;
  // Leçon dont des montants se calculent à partir des chiffres réglementaires
  build?: (figures: Figures) => unknown;
  // Univers conseillé : slug et nom exacts du serveur (seeder des univers,
  // ThemesResetSeeder du site), utilisés tant que GET /universes n'est pas chargé
  universe: { slug: string; name: string };
  // Début de la phrase de Val à l'étape du pseudo ; la suite nomme l'univers
  // (pseudoValLine)
  valLead: string;
};

// Tableau « Après la leçon » du document
export const DISCOVERY: Record<Objective, DiscoveryPlan> = {
  epargner: {
    lesson: epargner,
    build: buildEpargner,
    universe: { slug: 'avant-d-investir', name: 'Avant d’investir' },
    valLead: 'Mettre de l’argent de côté ?',
  },
  investir: {
    lesson: investir,
    universe: { slug: 'bourse', name: 'Bourse' },
    valLead: 'Faire travailler ton argent ?',
  },
  crypto: {
    lesson: crypto,
    universe: { slug: 'crypto', name: 'Crypto' },
    valLead: 'La crypto, sans le bruit autour ?',
  },
  logement: {
    lesson: logement,
    build: buildLogement,
    universe: { slug: 'se-loger', name: 'Se loger' },
    valLead: 'Un logement à toi, un jour ?',
  },
  impots: {
    lesson: impots,
    build: buildImpots,
    universe: { slug: 'impots', name: 'Impôts, déclarations et remboursements' },
    valLead: 'Payer moins d’impôts ?',
  },
  decouvrir: {
    lesson: decouvrir,
    universe: { slug: 'paie-primes-et-aides', name: 'Paie, primes et aides' },
    valLead: 'Tu découvres ? Parfait,',
  },
};

// Nom de l'univers conseillé : celui du serveur s'il est chargé, sinon celui
// du code. Apostrophe typographique, comme dans tous les textes de l'app.
export function universeName(plan: DiscoveryPlan, universes: readonly Universe[] = []): string {
  const loaded = universes.find((u) => u.slug === plan.universe.slug)?.name?.trim();
  return (loaded || plan.universe.name).replace(/'/g, '’');
}

// Phrase de Val à l'étape du pseudo : l'accroche de l'objectif, puis l'univers
// nommé en fin de phrase (naturel même avec un nom long)
export function pseudoValLine(plan: DiscoveryPlan, universes: readonly Universe[] = []): string {
  const next = plan.valLead.endsWith(',') ? 'on commencera' : 'On commencera';
  return `${plan.valLead} ${next} par l’univers ${universeName(plan, universes)}. Moi, c’est Val. Et toi ?`;
}

export function discoveryPlan(objective: Objective | null | undefined): DiscoveryPlan {
  return DISCOVERY[toObjective(objective) ?? 'decouvrir'];
}

// Leçon prête pour le lecteur, avec les chiffres réglementaires reçus du site
// (state/regulatoryFigures) ; sans eux, les valeurs de secours. Les montants
// qui en dépendent sont recalculés, puis les repères {{cle}} remplacés.
export function discoveryLesson(objective: Objective | null | undefined, figures: Figures = FALLBACK_FIGURES): LessonModel {
  const plan = discoveryPlan(objective);
  const lesson = plan.build ? plan.build(figures) : plan.lesson;
  return normalizeLesson(fillFiguresDeep(lesson, figures));
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
