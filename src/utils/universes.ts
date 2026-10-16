// Univers de l'onglet Apprendre (GET /universes). Fonctions pures, sans
// React : testables avec Node. La forme renvoyée par le serveur n'est connue
// que de lesson/normalize ; la couleur d'un univers, de utils/modulePath.

import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

import type { Module } from '@/src/context/ApiContext';
import type { Universe } from '../lesson/model';
import { normalizeUniverses } from '../lesson/normalize';
import type { DecorName } from './modulePath';
import { completedCount, moduleState, totalCount } from './learning';

export type IoniconName = ComponentProps<typeof Ionicons>['name'];

// GET /universes. La route peut ne pas exister encore (404) ou échouer : on
// renvoie null, sans erreur, et l'app continue sans univers.
export async function fetchUniverses(get: (path: string) => Promise<unknown>): Promise<Universe[] | null> {
  try {
    return normalizeUniverses(await get('/universes'));
  } catch {
    return null;
  }
}

// Icône contour de chaque univers, par slug (les 15 univers du site)
export const UNIVERSE_ICONS: Record<string, IoniconName> = {
  'avant-d-investir': 'compass-outline',
  bourse: 'trending-up-outline',
  crypto: 'cube-outline',
  immobilier: 'business-outline',
  'investir-autrement': 'diamond-outline',
  'paie-primes-et-aides': 'cash-outline',
  'revenus-annexes': 'rocket-outline',
  entreprendre: 'briefcase-outline',
  'garder-la-main': 'wallet-outline',
  'se-loger': 'home-outline',
  'savoir-s-endetter': 'card-outline',
  impots: 'receipt-outline',
  macroeconomie: 'globe-outline',
  'prix-marches': 'pricetags-outline',
  'analyser-une-entreprise': 'bar-chart-outline',
};
export const DEFAULT_UNIVERSE_ICON: IoniconName = 'planet-outline';

// Décor peint de chaque univers (assets/images/decor), dans l'esprit de la
// table catégorie → décor du dictionnaire (utils/dictionary.ts) : bourse et
// marchés → graphique, crypto → pièces, logement → clé, impôts → calculatrice…
export const UNIVERSE_DECORS: Record<string, DecorName> = {
  'avant-d-investir': 'tirelire', // épargne
  bourse: 'graphique',
  crypto: 'pile-pieces',
  immobilier: 'cle',
  'investir-autrement': 'coffre-fort', // placements à l'abri
  'paie-primes-et-aides': 'carnet', // fiche de paie
  'revenus-annexes': 'pile-pieces',
  entreprendre: 'carnet', // comptes, registres
  'garder-la-main': 'enveloppe', // budget
  'se-loger': 'cle',
  'savoir-s-endetter': 'banque', // crédit
  impots: 'calculatrice',
  macroeconomie: 'plante', // croissance
  'prix-marches': 'graphique',
  'analyser-une-entreprise': 'carnet',
};

export function universeDecor(slug: string): DecorName {
  return Object.hasOwn(UNIVERSE_DECORS, slug) ? UNIVERSE_DECORS[slug] : 'plante';
}

// Illustration peinte de chaque univers (assets/images/univers/<slug>.webp,
// détourée sur fond transparent ; les images : constants/universeImages).
// Un univers sans illustration garde son décor peint.
export const UNIVERSE_ARTS = [
  'avant-d-investir',
  'bourse',
  'crypto',
  'immobilier',
  'investir-autrement',
  'paie-primes-et-aides',
  'revenus-annexes',
  'entreprendre',
  'garder-la-main',
  'se-loger',
  'savoir-s-endetter',
  'impots',
  'macroeconomie',
  'prix-marches',
  'analyser-une-entreprise',
] as const;
export type UniverseArtName = (typeof UNIVERSE_ARTS)[number];

export type UniverseArtRef = { kind: 'art'; name: UniverseArtName } | { kind: 'decor'; name: DecorName };

export function universeArt(slug: string): UniverseArtRef {
  const name = UNIVERSE_ARTS.find((s) => s === slug);
  return name ? { kind: 'art', name } : { kind: 'decor', name: universeDecor(slug) };
}

// Phrase de Val à la première visite d'un univers
export const UNIVERSE_INTROS: Record<string, string> = {
  'avant-d-investir': 'Avant de placer un euro, on pose les fondations : coussin de sécurité, dettes, horizon.',
  bourse: 'La bourse sans jargon : on va comprendre ce que tu achètes vraiment.',
  crypto: 'Bitcoin et compagnie : on regarde ce qui brille, et ce qui peut faire mal.',
  immobilier: 'Acheter, louer, investir : on fait les comptes avant de signer quoi que ce soit.',
  'investir-autrement': 'Or, art, vin… On explore les placements à part, sans tomber dans leurs pièges.',
  'paie-primes-et-aides': 'Ta fiche de paie cache des choses. On la lit ensemble, et on cherche les aides oubliées.',
  'revenus-annexes': 'Gagner un peu plus à côté, c’est possible. On voit comment, et ce que ça change.',
  entreprendre: 'Lancer ton activité ? On parle statut, chiffres et premiers clients.',
  'garder-la-main': 'Ton argent du quotidien : on reprend la main sur ton budget, sans tout te refuser.',
  'se-loger': 'Louer, déménager, choisir : on fait le tour avant que tu signes.',
  'savoir-s-endetter': 'Un crédit peut aider… ou piéger. On apprend à lire le vrai prix d’un emprunt.',
  impots: 'Les impôts, ça se comprend. On avance pas à pas, promis.',
  macroeconomie: 'Inflation, taux, croissance : on prend de la hauteur pour voir le grand tableau.',
  'prix-marches': 'Pourquoi les prix montent et descendent ? On ouvre le capot des marchés.',
  'analyser-une-entreprise': 'Bilan, marges, dettes : on apprend à juger une entreprise comme un pro.',
};

export function universeIntro(slug: string, description: string | null): string {
  if (Object.hasOwn(UNIVERSE_INTROS, slug)) return UNIVERSE_INTROS[slug];
  return description ? `Bienvenue ! ${description}` : 'Bienvenue dans cet univers. On avance à ton rythme.';
}

// Les quatre familles du site, dans leur ordre, avec leurs univers
export type UniverseFamily = { key: string; title: string; slugs: readonly string[] };

export const UNIVERSE_FAMILIES: readonly UniverseFamily[] = [
  {
    key: 'investir',
    title: 'Investir',
    slugs: ['avant-d-investir', 'bourse', 'crypto', 'immobilier', 'investir-autrement'],
  },
  { key: 'gagner', title: 'Gagner de l’argent', slugs: ['paie-primes-et-aides', 'revenus-annexes', 'entreprendre'] },
  { key: 'gerer', title: 'Gérer au quotidien', slugs: ['garder-la-main', 'se-loger', 'savoir-s-endetter', 'impots'] },
  {
    key: 'comprendre',
    title: 'Comprendre l’économie',
    slugs: ['macroeconomie', 'prix-marches', 'analyser-une-entreprise'],
  },
];

export function universeFamily(slug: string): UniverseFamily | null {
  return UNIVERSE_FAMILIES.find((f) => f.slugs.includes(slug)) ?? null;
}

// Univers rangés par famille (ordre reçu dans chaque famille) ; ceux d'aucune
// famille connue, à la fin sous « Autres univers ». Familles vides omises.
export function groupByFamily<T extends { universe: Universe }>(entries: T[]): { title: string; entries: T[] }[] {
  const groups = UNIVERSE_FAMILIES.map((family) => ({
    title: family.title,
    entries: entries.filter((e) => family.slugs.includes(e.universe.slug)),
  }));
  const others = entries.filter((e) => !universeFamily(e.universe.slug));
  return [...groups, { title: 'Autres univers', entries: others }].filter((g) => g.entries.length > 0);
}

export function universeIcon(slug: string): IoniconName {
  return Object.hasOwn(UNIVERSE_ICONS, slug) ? UNIVERSE_ICONS[slug] : DEFAULT_UNIVERSE_ICON;
}

export type UniverseEntry = {
  universe: Universe;
  // Modules chargés (donc publiés) de l'univers, dans l'ordre de module_ids
  modules: Module[];
  done: number;
  // Leçons terminées sur l'ensemble de ses modules, de 0 à 1
  progress: number;
};

export function universeEntry(universe: Universe, modules: Module[]): UniverseEntry {
  const own = universe.moduleIds
    .map((id) => modules.find((m) => m.id === id))
    .filter((m): m is Module => !!m);
  const lessons = own.reduce((sum, m) => sum + totalCount(m), 0);
  const completed = own.reduce((sum, m) => sum + completedCount(m), 0);
  return {
    universe,
    modules: own,
    done: own.filter((m) => moduleState(m) === 'done').length,
    progress: lessons === 0 ? 0 : completed / lessons,
  };
}

// Univers à afficher, dans l'ordre de position : ceux qui ont au moins un
// module publié. Liste vide → l'accueil garde la liste des modules.
export function visibleUniverses(universes: Universe[], modules: Module[]): UniverseEntry[] {
  return universes.map((u) => universeEntry(u, modules)).filter((e) => e.modules.length > 0);
}

// Modules rangés dans aucun univers affiché : listés à part, sinon ils
// seraient introuvables depuis l'accueil
export function modulesOutsideUniverses(entries: UniverseEntry[], modules: Module[]): Module[] {
  const shown = new Set(entries.flatMap((e) => e.modules.map((m) => m.id)));
  return modules.filter((m) => !shown.has(m.id));
}

export function findUniverse(universes: Universe[], id: number | null): Universe | null {
  return id === null ? null : (universes.find((u) => u.id === id) ?? null);
}

// "0 module sur 3 terminé", "2 modules sur 3 terminés" (singulier sous 2)
export function modulesProgressLabel(done: number, total: number): string {
  return done >= 2 ? `${done} modules sur ${total} terminés` : `${done} module sur ${total} terminé`;
}

// « UNIVERS AVANT D'INVESTIR », au-dessus du titre de la bannière d'un module
export function universeBannerLabel(name: string | null | undefined): string | null {
  return name ? `Univers ${name}`.toUpperCase() : null;
}
