import { Stack } from 'expo-router';

// Pile propre à l'onglet Apprendre : la page module s'empile ici, donc la
// barre d'onglets reste visible. Le lecteur de leçon (app/apprendre/[id])
// vit dans la pile racine et passe, lui, par-dessus les onglets.
export default function ApprendreTabLayout() {
  return (
    // Fondu : les écrans sont transparents (fond commun), un glissement
    // laisserait voir l'écran du dessous à travers celui qui arrive
    <Stack screenOptions={{ headerShown: false, animation: 'fade', contentStyle: { backgroundColor: 'transparent' } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="module/[moduleId]" />
    </Stack>
  );
}
