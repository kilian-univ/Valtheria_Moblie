import { OpaqueScreen } from '@/src/components/common/AppBackground';
import WordTestScreen from '@/src/screens/dictionary/WordTestScreen';

// Test sur le mot d'une fiche, en plein écran (pile racine, par-dessus les
// onglets), dans le lecteur des leçons
export default function WordTestRoute() {
  return (
    <OpaqueScreen tab="dictionary">
      <WordTestScreen />
    </OpaqueScreen>
  );
}
