import { Stack } from 'expo-router';

// Pile propre à l'onglet Dictionnaire : la fiche d'un mot s'empile ici, donc
// la barre d'onglets reste visible. L'accueil reste dessous même quand la
// fiche est ouverte directement (lien d'un article) : le retour y mène.
export const unstable_settings = { initialRouteName: 'index' };

export default function DictionaryTabLayout() {
  return (
    // Transitions natives (glissement et geste retour sur iOS). L'accueil,
    // transparent, laisse voir le fond commun animé ; la fiche est opaque
    // (OpaqueScreen) et ne laisse jamais voir l'accueil.
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="mot" />
    </Stack>
  );
}
