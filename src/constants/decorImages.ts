import { ImageSourcePropType } from 'react-native';

import type { DecorName } from '@/src/utils/modulePath';

// Décors peints (assets/images/decor), déjà assombris à 80 % à la conversion :
// chemin des modules et illustration de la fiche d'un mot
export const DECOR_IMAGES: Record<DecorName, ImageSourcePropType> = {
  'pile-pieces': require('@/assets/images/decor/deco-pile-pieces.webp'),
  tirelire: require('@/assets/images/decor/deco-tirelire.webp'),
  'coffre-fort': require('@/assets/images/decor/deco-coffre-fort.webp'),
  plante: require('@/assets/images/decor/deco-plante.webp'),
  graphique: require('@/assets/images/decor/deco-graphique.webp'),
  calculatrice: require('@/assets/images/decor/deco-calculatrice.webp'),
  carnet: require('@/assets/images/decor/deco-carnet.webp'),
  sablier: require('@/assets/images/decor/deco-sablier.webp'),
  cle: require('@/assets/images/decor/deco-cle.webp'),
  enveloppe: require('@/assets/images/decor/deco-enveloppe.webp'),
  banque: require('@/assets/images/decor/deco-banque.webp'),
};
