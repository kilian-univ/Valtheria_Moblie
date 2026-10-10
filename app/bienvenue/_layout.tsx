import { Stack } from 'expo-router';

// Première ouverture, sans compte : bienvenue → prénom → objectif → leçon
// découverte → fin → inscription (ou rappel, inscription fermée). Pile racine, par-dessus les onglets ; chaque page est
// opaque (OpaqueScreen). Pas de balayage retour vers une étape déjà passée
// qui n'a plus de sens (bienvenue, leçon, fin) : on en sort par les boutons.
export default function BienvenueLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }}>
      <Stack.Screen name="index" options={{ gestureEnabled: false }} />
      <Stack.Screen name="prenom" />
      <Stack.Screen name="objectif" />
      {/* Lecteur : on sort par la croix (feuille « Quitter la leçon ? ») */}
      <Stack.Screen name="lecon" options={{ gestureEnabled: false }} />
      <Stack.Screen name="fin" options={{ gestureEnabled: false }} />
      <Stack.Screen name="inscription" options={{ gestureEnabled: false }} />
      <Stack.Screen name="rappel" />
    </Stack>
  );
}
