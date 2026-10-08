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

// Sous « À SUIVRE » : Val, sa bulle, le module et la leçon, le bouton
export function UpNextSkeleton() {
  return (
    <View>
      <View style={styles.valRow}>
        <Skeleton width={120} height={150} shape="block" />
        <Skeleton width="100%" height={BUBBLE_HEIGHT} shape="block" style={styles.bubble} />
      </View>
      <View style={styles.meta}>
        <Skeleton width={180} height={13} />
        <Skeleton width="65%" height={22} />
      </View>
      <Skeleton width="100%" height={size.buttonHeight} shape="button" style={styles.button} />
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
  valRow: {
    paddingTop: space[4],
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: space[2],
  },
  bubble: {
    flex: 1,
    marginBottom: space[4],
  },
  meta: {
    marginTop: 18,
    gap: space[2],
  },
  button: {
    marginTop: 14,
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
