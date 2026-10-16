import { StyleSheet, View } from 'react-native';

import Skeleton from '@/src/components/common/Skeleton';
import { palette, size, space } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';

const ROWS = 4;
const RING = 44;
// Bulle de Val sur deux lignes de texte (2 × 24) + son padding (2 × 12)
const BUBBLE_HEIGHT = 72;

// Squelettes de l'accueil. Le cadre (en-tête, intitulés de section) reste
// réel : seules les parties qui attendent des données sont des blocs, aux
// dimensions exactes du contenu qui les remplacera.

// Programme du jour : Val et sa bulle, la carte de la leçon, la ligne de la
// révision ; puis le carrousel des univers
export function ProgramSkeleton() {
  return (
    <View style={styles.program}>
      <View style={styles.programVal}>
        <Skeleton width={118} height={122} shape="block" />
        <Skeleton width="100%" height={BUBBLE_HEIGHT} shape="block" style={styles.bubble} />
      </View>
      <Skeleton width="100%" height={176} shape="block" />
      <Skeleton width="100%" height={66} shape="block" />
    </View>
  );
}

export function CarouselSkeleton() {
  return (
    <View style={styles.carousel}>
      <Skeleton width={168} height={236} shape="block" />
      <Skeleton width={168} height={236} shape="block" />
      <Skeleton width={168} height={236} shape="block" />
    </View>
  );
}

// Sous « MODULES » : 4 lignes (anneau, titre, sous-titre), séparées par les filets
export function ModuleRowsSkeleton() {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];

  return (
    <View style={styles.rows}>
      {Array.from({ length: ROWS }, (_, i) => (
        <View
          key={i}
          style={[styles.row, i < ROWS - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
        >
          <Skeleton width={RING} height={RING} shape="circle" />
          <View style={styles.rowTexts}>
            <Skeleton width="60%" height={16} />
            <Skeleton width="35%" height={13} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  program: {
    gap: 14,
  },
  programVal: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: space[2],
  },
  carousel: {
    flexDirection: 'row',
    gap: space[3],
    overflow: 'hidden',
  },
  bubble: {
    flex: 1,
    marginBottom: space[4],
  },
  // Même retrait que les vraies lignes (ListRow) pour que rien ne bouge
  rows: {
    marginHorizontal: -space[4],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    minHeight: size.rowMin,
    paddingVertical: space[4],
    paddingHorizontal: space[4],
  },
  rowTexts: {
    flex: 1,
    gap: space[2],
  },
});
