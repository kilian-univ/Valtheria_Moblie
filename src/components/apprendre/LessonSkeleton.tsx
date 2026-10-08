import { StyleSheet, View } from 'react-native';

import Skeleton from '@/src/components/common/Skeleton';
import { space } from '@/src/constants/style/Style';

const VAL = 64;
const BUBBLE_HEIGHT = 64;
const OPTION_HEIGHT = 56;
const OPTIONS = 3;

// Squelette d'un écran de leçon (sous la vraie barre du haut) : Val et sa
// bulle, trois lignes de question, trois options.
export default function LessonSkeleton() {
  return (
    <View style={styles.wrap} accessible accessibilityLabel="Chargement de la leçon">
      <View style={styles.valRow}>
        <Skeleton width={VAL} height={VAL} shape="circle" />
        <Skeleton width="100%" height={BUBBLE_HEIGHT} shape="block" style={styles.bubble} />
      </View>

      <View style={styles.question}>
        <Skeleton width="92%" height={17} />
        <Skeleton width="80%" height={17} />
        <Skeleton width="45%" height={17} />
      </View>

      <View style={styles.options}>
        {Array.from({ length: OPTIONS }, (_, i) => (
          <Skeleton key={i} width="100%" height={OPTION_HEIGHT} shape="button" />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: space[5],
    paddingTop: space[4],
  },
  valRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space[3],
  },
  bubble: {
    flex: 1,
  },
  question: {
    marginTop: space[6],
    gap: space[2],
  },
  options: {
    marginTop: space[5],
    gap: space[3],
  },
});
