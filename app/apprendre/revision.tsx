import { OpaqueScreen } from '@/src/components/common/AppBackground';
import RevisionScreen from '@/src/screens/revision/RevisionScreen';

// Révision du jour, dans le lecteur des leçons (par-dessus les onglets)
export default function RevisionRoute() {
  return (
    <OpaqueScreen tab="apprendre">
      <RevisionScreen />
    </OpaqueScreen>
  );
}
