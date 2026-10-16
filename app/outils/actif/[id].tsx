import { OpaqueScreen } from '@/src/components/common/AppBackground';
import ActifScreen from '@/src/screens/patrimoine/ActifScreen';

export default function Actif() {
  return (
    <OpaqueScreen tab="outils">
      <ActifScreen />
    </OpaqueScreen>
  );
}
