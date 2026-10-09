import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import ListRow from '@/src/components/common/ListRow';
import ProgressRing from '@/src/components/common/ProgressRing';
import { moduleColors } from '@/src/constants/style/Style';
import { universeColorKey } from '@/src/utils/modulePath';
import { modulesProgressLabel, universeIcon, UniverseEntry } from '@/src/utils/universes';

const BADGE = 44;
const ICON = 22;
const RING = 28;
const RING_STROKE = 3;

type UniverseRowProps = {
  entry: UniverseEntry;
  last: boolean;
  onPress: () => void;
};

// Ligne d'univers : pastille à sa couleur avec son icône, nom, modules
// terminés, et anneau de progression (leçons terminées) à droite.
export default function UniverseRow({ entry, last, onPress }: UniverseRowProps) {
  const tint = moduleColors[universeColorKey(entry.universe)];
  const total = entry.modules.length;

  return (
    <ListRow
      title={entry.universe.name}
      subtitle={modulesProgressLabel(entry.done, total)}
      leading={
        <View style={[styles.badge, { backgroundColor: tint.face }]}>
          <Ionicons name={universeIcon(entry.universe.slug)} size={ICON} color={tint.onFace} />
        </View>
      }
      trailing={
        <ProgressRing diameter={RING} stroke={RING_STROKE} progress={entry.progress} done={total > 0 && entry.done === total} />
      }
      showChevron
      last={last}
      onPress={onPress}
    />
  );
}

const styles = StyleSheet.create({
  badge: {
    width: BADGE,
    height: BADGE,
    borderRadius: BADGE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
