import PatrimoineStateScreen from '@/src/components/patrimoine/PatrimoineStateScreen';
import { usePatrimoineView } from '@/src/hooks/usePatrimoineView';
import { useSavingsImport } from '@/src/hooks/useSavingsImport';
import PatrimoineScreen from './PatrimoineScreen';

// Mon patrimoine, ou son état : chargement, sans compte, erreur (réseau ou
// serveur, avec « Réessayer »). Jamais l'ancien écran du portefeuille : une
// erreur reste une erreur du nouvel écran.
export default function PatrimoineGate() {
  const v = usePatrimoineView();
  // Objectifs de l'ancien outil Épargne repris, une seule fois
  useSavingsImport();
  if (v.view !== 'ready') return <PatrimoineStateScreen view={v.view} title="Mon patrimoine" errorKind={v.errorKind} onRetry={v.retry} />;
  return <PatrimoineScreen />;
}
