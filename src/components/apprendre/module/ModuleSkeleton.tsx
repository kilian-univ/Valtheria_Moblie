import { StyleSheet, View } from 'react-native';

import Skeleton from '@/src/components/common/Skeleton';
import { palette, size, space } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';

// Mêmes dimensions que l'en-tête et le chemin réels (ModuleHeader, LessonPath)
const RING = 72;
const NODE = 64;
const SPACING = 105;
const OFFSETS = [0, -95, 0, 95];
const TITLE_LINE = 30;
const LABEL_GAP = 6;
const FADE_HEIGHT = 28;

// Squelette de la page module : titre sur deux lignes et anneau de 72 à
// droite, puis 4 ronds du chemin en zigzag avec une ligne de titre chacun.
export default function ModuleSkeleton() {
  return (
    <View accessible accessibilityLabel="Chargement du module">
      <View style={styles.titleRow}>
        <View style={styles.titles}>
          <Skeleton width="85%" height={TITLE_LINE} />
          <Skeleton width="55%" height={TITLE_LINE} />
          <Skeleton width={150} height={14} style={styles.subtitle} />
        </View>
        <Skeleton width={RING} height={RING} shape="circle" />
      </View>

      <View style={styles.path}>
        {OFFSETS.map((offset, i) => (
          <View key={i} style={[styles.node, { transform: [{ translateX: offset }] }]}>
            <Skeleton width={NODE} height={NODE} shape="circle" />
            <Skeleton width={96} height={13} />
          </View>
        ))}
      </View>
    </View>
  );
}

// Bloc du bouton « Leçon suivante », à la place exacte de la barre du bas
export function NextBarSkeleton() {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];

  return (
    <View style={styles.bar} pointerEvents="none">
      <View style={[styles.panel, { backgroundColor: colors.background }]}>
        <Skeleton width="100%" height={size.buttonHeight} shape="button" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    marginTop: space[2],
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[4],
  },
  titles: {
    flex: 1,
    gap: space[2],
  },
  subtitle: {
    marginTop: space[1],
  },
  path: {
    marginTop: space[8] + space[4],
  },
  node: {
    alignSelf: 'center',
    alignItems: 'center',
    gap: LABEL_GAP,
    height: SPACING,
  },
  // Placé en bas d'écran par la page (comme NextLessonBar)
  bar: {
    paddingTop: FADE_HEIGHT,
  },
  panel: {
    paddingHorizontal: space[5],
    paddingBottom: space[4],
  },
});
