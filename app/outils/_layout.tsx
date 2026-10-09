import { Stack } from 'expo-router';

export default function OutilsLayout() {
  return (
    // Transitions natives ; chaque page est opaque (OpaqueScreen)
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }}>
      <Stack.Screen name="portefeuille" />
      <Stack.Screen name="cashflow" />
      <Stack.Screen name="epargne" />
    </Stack>
  );
}