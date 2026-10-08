import ListRow from '@/src/components/common/ListRow';
import ProgressRing from '@/src/components/common/ProgressRing';
import { Module } from '@/src/context/ApiContext';
import { moduleProgress, moduleState, moduleSubtitle } from '@/src/utils/learning';

const RING = 44;
const RING_STROKE = 4;

type ModuleRowProps = {
  module: Module;
  last: boolean;
  onPress: () => void;
};

// Ligne de module : anneau de progression à gauche (vide, en cours ou
// terminé), titre et état.
export default function ModuleRow({ module, last, onPress }: ModuleRowProps) {
  const state = moduleState(module);
  const progress = moduleProgress(module);

  return (
    <ListRow
      title={module.title}
      subtitle={moduleSubtitle(module)}
      leading={
        <ProgressRing
          diameter={RING}
          stroke={RING_STROKE}
          progress={progress}
          done={state === 'done'}
          // Espace fine insécable avant % : à la française, et ça tient dans 44 px
          label={state === 'started' ? `${Math.round(progress * 100)} %` : undefined}
        />
      }
      showChevron
      last={last}
      onPress={onPress}
    />
  );
}
