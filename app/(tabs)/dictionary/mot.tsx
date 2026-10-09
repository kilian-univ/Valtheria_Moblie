import { OpaqueScreen } from '@/src/components/common/AppBackground';
import TermScreen from '@/src/screens/dictionary/TermScreen';

// Page poussée sur une pile : opaque, avec sa copie du fond commun
export default function TermRoute() {
  return (
    <OpaqueScreen tab="dictionary">
      <TermScreen />
    </OpaqueScreen>
  );
}
