import { OpaqueScreen } from '@/src/components/common/AppBackground';
import AnalyseScreen from '@/src/screens/patrimoine/AnalyseScreen';

export default function Analyse() {
  return (
    <OpaqueScreen tab="outils">
      <AnalyseScreen />
    </OpaqueScreen>
  );
}
