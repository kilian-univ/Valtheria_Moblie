import TermScreen from '@/src/screens/dictionary/TermScreen';

// Fiche d'un mot ouverte hors de l'onglet Dictionnaire (lien d'un article…) :
// pile racine, au-dessus de l'écran d'origine, où ramènent le retour et le
// geste retour. Voir src/utils/dictionaryLinks.
export default function StandaloneTermScreen() {
  return <TermScreen standalone />;
}
