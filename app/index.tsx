import { Redirect } from 'expo-router';

// Adresse de démarrage (« / ») : l'accueil d'Apprendre. La porte de lancement
// (OnboardingGate) envoie ensuite au parcours de bienvenue s'il le faut.
// Sans cette route, l'app démarrait sur une page introuvable.
export default function Index() {
  return <Redirect href="/apprendre" />;
}
