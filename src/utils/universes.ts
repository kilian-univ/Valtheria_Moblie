// Univers de l'onglet Apprendre (GET /universes). Fonctions pures, sans
// React : testables avec Node. La forme renvoyée par le serveur n'est connue
// que de lesson/normalize ; la couleur d'un univers, de utils/modulePath.

import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

import type { Module } from '@/src/context/ApiContext';
import type { Universe } from '../lesson/model';
import { normalizeUniverses } from '../lesson/normalize';
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
