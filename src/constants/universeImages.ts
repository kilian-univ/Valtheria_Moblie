import { ImageSourcePropType } from 'react-native';

import type { UniverseArtName } from '@/src/utils/universes';

type ArtSources = { large: ImageSourcePropType; small: ImageSourcePropType };

// Illustrations des univers (assets/images/univers), détourées, centrées sur
// un carré transparent avec 8 % de marge : 512 px, et 256 px (-sm) pour les
// petits affichages
export const UNIVERSE_IMAGES: Record<UniverseArtName, ArtSources> = {
  'avant-d-investir': {
    large: require('@/assets/images/univers/avant-d-investir.webp'),
    small: require('@/assets/images/univers/avant-d-investir-sm.webp'),
  },
  bourse: {
    large: require('@/assets/images/univers/bourse.webp'),
    small: require('@/assets/images/univers/bourse-sm.webp'),
  },
  crypto: {
    large: require('@/assets/images/univers/crypto.webp'),
    small: require('@/assets/images/univers/crypto-sm.webp'),
  },
  immobilier: {
    large: require('@/assets/images/univers/immobilier.webp'),
    small: require('@/assets/images/univers/immobilier-sm.webp'),
  },
  'investir-autrement': {
    large: require('@/assets/images/univers/investir-autrement.webp'),
    small: require('@/assets/images/univers/investir-autrement-sm.webp'),
  },
  'paie-primes-et-aides': {
    large: require('@/assets/images/univers/paie-primes-et-aides.webp'),
    small: require('@/assets/images/univers/paie-primes-et-aides-sm.webp'),
  },
  'revenus-annexes': {
    large: require('@/assets/images/univers/revenus-annexes.webp'),
    small: require('@/assets/images/univers/revenus-annexes-sm.webp'),
  },
  entreprendre: {
    large: require('@/assets/images/univers/entreprendre.webp'),
    small: require('@/assets/images/univers/entreprendre-sm.webp'),
  },
  'garder-la-main': {
    large: require('@/assets/images/univers/garder-la-main.webp'),
    small: require('@/assets/images/univers/garder-la-main-sm.webp'),
  },
  'se-loger': {
    large: require('@/assets/images/univers/se-loger.webp'),
    small: require('@/assets/images/univers/se-loger-sm.webp'),
  },
  'savoir-s-endetter': {
    large: require('@/assets/images/univers/savoir-s-endetter.webp'),
    small: require('@/assets/images/univers/savoir-s-endetter-sm.webp'),
  },
  impots: {
    large: require('@/assets/images/univers/impots.webp'),
    small: require('@/assets/images/univers/impots-sm.webp'),
  },
  macroeconomie: {
    large: require('@/assets/images/univers/macroeconomie.webp'),
    small: require('@/assets/images/univers/macroeconomie-sm.webp'),
  },
  'prix-marches': {
    large: require('@/assets/images/univers/prix-marches.webp'),
    small: require('@/assets/images/univers/prix-marches-sm.webp'),
  },
  'analyser-une-entreprise': {
    large: require('@/assets/images/univers/analyser-une-entreprise.webp'),
    small: require('@/assets/images/univers/analyser-une-entreprise-sm.webp'),
  },
};
