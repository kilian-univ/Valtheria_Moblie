import { OpaqueScreen } from '@/src/components/common/AppBackground';
import TermScreen from '@/src/screens/dictionary/TermScreen';

// Fiche d'un mot ouverte hors de l'onglet Dictionnaire (lien d'un article…) :
// pile racine, au-dessus de l'écran d'origine, où ramènent le retour et le
// geste retour. Voir src/utils/dictionaryLinks. Opaque, avec le fond de
// l'onglet Dictionnaire.
export default function StandaloneTermScreen() {
  return (
    <OpaqueScreen tab="dictionary">
      <TermScreen standalone />
    </OpaqueScreen>
  );
}
