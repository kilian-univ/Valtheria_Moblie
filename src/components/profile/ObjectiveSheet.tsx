import { StyleSheet, View } from 'react-native';

import ReliefOption from '@/src/components/apprendre/player/ReliefOption';
import AppText from '@/src/components/common/AppText';
import BottomSheet from '@/src/components/common/BottomSheet';
import type { IconName } from '@/src/components/common/IconButton';
import { space } from '@/src/constants/style/Style';
import { DISCOVERY, OBJECTIVE_OPTIONS, type Objective } from '@/src/lesson/discovery';
import type { Universe } from '@/src/lesson/model';
import { universeTint } from '@/src/utils/universeTint';

type ObjectiveSheetProps = {
  open: boolean;
  current: Objective | null;
  universes: Universe[];
  onPick: (objective: Objective) => void;
  onRequestClose: () => void;
  onClosed: () => void;
};

// Les six objectifs de la première ouverture, à la couleur de leur univers
export default function ObjectiveSheet({ open, current, universes, onPick, onRequestClose, onClosed }: ObjectiveSheetProps) {
  return (
    <BottomSheet open={open} onRequestClose={onRequestClose} onClosed={onClosed}>
      <View style={styles.content}>
        <AppText variant="title3" accessibilityRole="header">
          Ton objectif
        </AppText>
        <View style={styles.options} accessibilityRole="radiogroup">
          {OBJECTIVE_OPTIONS.map((o) => {
            const tint = universeTint(DISCOVERY[o.value].universe.slug, universes);
            return (
              <ReliefOption
                key={o.value}
                label={o.label}
                icon={o.icon as IconName}
                badge={{ color: tint.face, iconColor: tint.onFace }}
                state={current === o.value ? 'selected' : 'idle'}
                selected={current === o.value}
                onPress={() => onPick(o.value)}
              />
            );
          })}
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: space[4],
    paddingHorizontal: space[5],
    paddingBottom: space[2],
  },
  options: {
    gap: space[3],
  },
});
