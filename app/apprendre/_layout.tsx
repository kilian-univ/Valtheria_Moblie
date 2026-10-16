import { Stack } from 'expo-router';

export default function ApprendreDetailLayout() {
  return (
    // Transitions natives ; le lecteur est opaque (OpaqueScreen)
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }}>
      {/* Lecteur de leçon : pas de balayage retour, on sort par la croix
          (feuille « Quitter la leçon ? ») */}
      <Stack.Screen name="[id]" options={{ gestureEnabled: false }} />
      {/* Révision du jour : même lecteur, même sortie par la croix */}
      <Stack.Screen name="revision" options={{ gestureEnabled: false }} />
    </Stack>
  );
}