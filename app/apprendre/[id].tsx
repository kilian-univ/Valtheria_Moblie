import { OpaqueScreen } from '@/src/components/common/AppBackground';
import ApprendreDetailScreen from '@/src/screens/ApprendreDetailScreen';

// Page poussée sur une pile : opaque, avec sa copie du fond commun
export default function LessonRoute() {
  return (
    <OpaqueScreen tab="apprendre">
      <ApprendreDetailScreen />
    </OpaqueScreen>
  );
}
