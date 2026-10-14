import { Easing } from 'react-native-reanimated';

import { motion } from './style/Style';

export { motion };

// Ressorts Reanimated (withSpring). Toujours passer par ces configs :
// les animations de l'app doivent se ressembler.
export const springs = {
  press: { damping: 15, stiffness: 300, mass: 1 },     // retour après appui
  enter: { damping: 18, stiffness: 180, mass: 1 },     // apparition d'un élément
  screen: { damping: 24, stiffness: 220, mass: 1 },    // grands blocs, feuilles
  celebrate: { damping: 10, stiffness: 160, mass: 1 }, // réussite (rebond visible)
  // Barre de progression du lecteur : avance en 300 ms, léger dépassement
  progress: { duration: motion.screen, dampingRatio: 0.72 },
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
  // Face d'un élément en relief qui s'enfonce dans sa tranche à l'appui
  sink: 80,
} as const;

// Boucles très douces (durée d'un aller-retour complet, en ms)
export const loops = {
  bubbleFloat: 3000, // bulle de Val qui flotte de 2 px
  breath: 3000, // Val qui respire (échelle 1 → 1,02)
  haloPulse: 4000, // halo qui pulse (opacité 0,8 → 1)
} as const;

// Courbe des compteurs et barres de progression
export const counterEasing = Easing.out(Easing.cubic);

// Courbe par défaut du lecteur de leçon (jetons motion de Style.ts)
export const easeOut = Easing.out(Easing.cubic);

// withTiming d'une durée du lecteur, en ease-out. Worklet : appelable aussi
// dans un geste (fil d'interface) ; une fonction ordinaire y ferait planter
// l'app sur téléphone.
export function timing(duration: number) {
  'worklet';
  return { duration, easing: easeOut };
}

// Au-delà de 8 éléments, les suivants apparaissent en même temps que le 8e
export const STAGGER_MAX_ITEMS = 8;

export function staggerDelay(index: number): number {
  return Math.min(index, STAGGER_MAX_ITEMS - 1) * durations.stagger;
}
