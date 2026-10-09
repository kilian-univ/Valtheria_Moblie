import { Stack } from 'expo-router';

export default function OutilsLayout() {
  return (
    // Fondu : écrans transparents sur le fond commun (voir apprendre/_layout)
    <Stack screenOptions={{ headerShown: false, animation: 'fade', contentStyle: { backgroundColor: 'transparent' } }}>
      <Stack.Screen name="portefeuille" />
      <Stack.Screen name="cashflow" />
      <Stack.Screen name="epargne" />
    </Stack>
  );
}