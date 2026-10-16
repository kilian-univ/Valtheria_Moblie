import { OpaqueScreen } from '@/src/components/common/AppBackground';
import PatrimoineGate from '@/src/screens/patrimoine/PatrimoineGate';

// Page poussée sur une pile : opaque, avec sa copie du fond commun.
// Nouveau suivi de patrimoine si le serveur le permet, sinon l'écran actuel.
export default function Portefeuille() {
  return (
    <OpaqueScreen tab="outils">
      <PatrimoineGate />
    </OpaqueScreen>
  );
}
