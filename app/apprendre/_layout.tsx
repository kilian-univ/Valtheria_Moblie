import { Stack } from 'expo-router';

export default function ApprendreDetailLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Lecteur de leçon : pas de balayage retour, on sort par la croix
          (feuille « Quitter la leçon ? ») */}
      <Stack.Screen name="[id]" options={{ gestureEnabled: false }} />
    </Stack>
  );
}