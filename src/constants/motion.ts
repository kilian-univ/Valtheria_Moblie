import { Easing } from 'react-native-reanimated';

// Ressorts Reanimated (withSpring). Toujours passer par ces configs :
// les animations de l'app doivent se ressembler.
export const springs = {
  press: { damping: 15, stiffness: 300, mass: 1 },     // retour après appui
  enter: { damping: 18, stiffness: 180, mass: 1 },     // apparition d'un élément
  screen: { damping: 24, stiffness: 220, mass: 1 },    // grands blocs, feuilles
  celebrate: { damping: 10, stiffness: 160, mass: 1 }, // réussite (rebond visible)
} as const;

// Durées en millisecondes (withTiming, withDelay)
export const durations = {
  pressIn: 120,
  fade: 200,
  enterOpacity: 320,
  counter: 750,
  shimmer: 1200,
  stagger: 90,
  skeletonDelay: 300,
} as const;

// Courbe des compteurs et barres de progression
export const counterEasing = Easing.out(Easing.cubic);

// Au-delà de 8 éléments, les suivants apparaissent en même temps que le 8e
export const STAGGER_MAX_ITEMS = 8;

export function staggerDelay(index: number): number {
  return Math.min(index, STAGGER_MAX_ITEMS - 1) * durations.stagger;
}
