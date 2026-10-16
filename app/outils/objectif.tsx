import { OpaqueScreen } from '@/src/components/common/AppBackground';
import ObjectifScreen from '@/src/screens/patrimoine/ObjectifScreen';

export default function Objectif() {
  return (
    <OpaqueScreen tab="outils">
      <ObjectifScreen />
    </OpaqueScreen>
  );
}
