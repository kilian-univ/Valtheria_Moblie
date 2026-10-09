import { StyleSheet, View } from 'react-native';

import Skeleton from '@/src/components/common/Skeleton';
import { palette, size, space } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { NODE_H, NODE_SIZES, PATH_TOP, pathOffset, STEP_Y } from '@/src/utils/modulePath';

const NODE_W = NODE_SIZES.lesson.w;

// Mêmes dimensions que la bannière et le chemin réels (ModuleBanner, ModulePath)
const BANNER_HEIGHT = 80;
const NODES = 5;
const FADE_HEIGHT = 28;

// Squelette de la page module : bannière, puis les premiers ronds du chemin
// en vague
export default function ModuleSkeleton() {
  return (
    <View accessible accessibilityLabel="Chargement du module">
      <Skeleton width="100%" height={BANNER_HEIGHT} shape="block" style={styles.banner} />
      <View style={[styles.path, { height: PATH_TOP + NODES * STEP_Y }]}>
        {Array.from({ length: NODES }, (_, i) => (
          <View
            key={i}
            style={[styles.node, { top: PATH_TOP + i * STEP_Y, transform: [{ translateX: pathOffset(i) }] }]}
          >
            <Skeleton width={NODE_W} height={NODE_H} shape="circle" />
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
  banner: {
    marginTop: space[3],
  },
  path: {
    marginTop: space[4],
  },
  node: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
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
