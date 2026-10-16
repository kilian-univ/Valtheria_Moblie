import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import ListRow from '@/src/components/common/ListRow';
import ProgressRing from '@/src/components/common/ProgressRing';
import { palette, radius } from '@/src/constants/style/Style';
import { Module } from '@/src/context/ApiContext';
import { useTheme } from '@/src/context/ThemeContext';
import { moduleProgress, moduleState } from '@/src/utils/learning';
import { moduleLessonsLabel } from '@/src/utils/levels';

const RING = 44;
const STROKE = 3;
const DOT = 32;

// Une ligne de module (page d'un univers, pensée pour beaucoup de modules) :
// anneau de progression à la couleur de l'univers autour d'un rond (triangle
// pour un module en cours, coche dorée pour un module terminé, vide sinon),
// titre en Fraunces, « 2 sur 5 leçons » ou « 5 leçons », chevron
export default function ModuleLine({
  module,
  color,
  last,
  onPress,
}: {
  module: Module;
  color: string;
  last: boolean;
  onPress: () => void;
}) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const state = moduleState(module);
  const subtitle = moduleLessonsLabel(module);
  const spoken = state === 'done' ? 'terminé' : state === 'started' ? 'en cours' : 'pas commencé';

  return (
    <ListRow
      serif
      compact
      title={module.title}
      subtitle={subtitle}
      showChevron
      last={last}
      onPress={onPress}
      accessibilityLabel={`${module.title}, ${spoken}, ${subtitle}`}
      leading={
        <ProgressRing
          progress={state === 'done' ? 1 : moduleProgress(module)}
          diameter={RING}
          stroke={STROKE}
          color={color}
          trackColor={colors.track}
        >
          <View style={[styles.dot, { backgroundColor: colors.optionFace }]}>
            {state === 'done' ? (
              <Ionicons name="checkmark" size={18} color={colors.gold} />
            ) : state === 'started' ? (
              <Ionicons name="play" size={12} color={colors.text} style={styles.play} />
            ) : null}
          </View>
        </ProgressRing>
      }
    />
  );
}

const styles = StyleSheet.create({
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  play: {
    marginLeft: 2,
  },
});
