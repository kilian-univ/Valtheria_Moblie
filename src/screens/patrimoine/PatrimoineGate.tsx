import { PortfolioSkeleton } from '@/src/components/common/ScreenSkeletons';
import { useApi } from '@/src/context/ApiContext';
import PortefeuilleScreen from '@/src/screens/PortefeuilleScreen';
import { usePatrimoine } from '@/src/state/patrimoineData';
import { userKeyOf } from '@/src/state/userMemory';
import PatrimoineScreen from './PatrimoineScreen';

// Aiguillage du portefeuille : le nouveau suivi de patrimoine si le serveur
// répond au format du lot portefeuille, sinon l'écran actuel, inchangé. La
// question est reposée à chaque ouverture : rien n'est basculé pour de bon.
export default function PatrimoineGate() {
  const { user, isAuthenticated, isLoading, getPortfolio } = useApi();
  const data = usePatrimoine(isAuthenticated && user?.id ? userKeyOf(user.id) : null, getPortfolio);

  if (isLoading || (isAuthenticated && !data.portfolio && data.status !== 'error')) {
    return <PortfolioSkeleton />;
  }
  if (isAuthenticated && data.ledger && data.portfolio) return <PatrimoineScreen />;
  return <PortefeuilleScreen />;
}
