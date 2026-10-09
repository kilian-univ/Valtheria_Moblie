import { Image, StyleSheet, View } from 'react-native';

import GroundShadow from '@/src/components/common/GroundShadow';
import { DECOR_IMAGES } from '@/src/constants/decorImages';
import { decorForCategory } from '@/src/utils/dictionary';

export const ILLUSTRATION_SIZE = 88;
const ROTATION = 4;
const SHADOW_H = 10;
const SHADOW_OPACITY = 0.4;

// Décor peint de la catégorie, à droite du mot : légère rotation, petite
// ombre au sol. Décoratif : ignoré par le lecteur d'écran.
export default function TermIllustration({ category }: { category: string }) {
  return (
    <View
      style={styles.box}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <GroundShadow
        width={ILLUSTRATION_SIZE * 0.7}
        height={SHADOW_H}
        opacity={SHADOW_OPACITY}
        left={ILLUSTRATION_SIZE * 0.15}
        top={ILLUSTRATION_SIZE - SHADOW_H / 2 - 4}
      />
      <Image
        source={DECOR_IMAGES[decorForCategory(category)]}
        resizeMode="contain"
        style={styles.image}
        accessibilityIgnoresInvertColors
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    width: ILLUSTRATION_SIZE,
    height: ILLUSTRATION_SIZE + SHADOW_H / 2,
  },
  image: {
    width: ILLUSTRATION_SIZE,
    height: ILLUSTRATION_SIZE,
    transform: [{ rotate: `${ROTATION}deg` }],
  },
});
