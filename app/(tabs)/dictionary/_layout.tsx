import { Stack } from 'expo-router';

// Pile propre à l'onglet Dictionnaire : la fiche d'un mot s'empile ici, donc
// la barre d'onglets reste visible. L'accueil reste dessous même quand la
// fiche est ouverte directement (lien d'un article) : le retour y mène.
export const unstable_settings = { initialRouteName: 'index' };

export default function DictionaryTabLayout() {
  return (
    // Fondu : les écrans sont transparents (fond commun), un glissement
    // laisserait voir l'écran du dessous à travers celui qui arrive
    <Stack screenOptions={{ headerShown: false, animation: 'fade', contentStyle: { backgroundColor: 'transparent' } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="mot" />
    </Stack>
  );
}
