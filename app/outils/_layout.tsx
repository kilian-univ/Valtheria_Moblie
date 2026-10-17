import { Stack } from 'expo-router';

export default function OutilsLayout() {
  return (
    // Transitions natives ; chaque page est opaque (OpaqueScreen)
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' }, freezeOnBlur: true }}>
      <Stack.Screen name="portefeuille" />
      <Stack.Screen name="actif/[id]" />
      <Stack.Screen name="operation" />
      <Stack.Screen name="recherche" />
      <Stack.Screen name="objectif" />
      <Stack.Screen name="analyse" />
      <Stack.Screen name="cashflow" />
      <Stack.Screen name="epargne" />
    </Stack>
  );
}