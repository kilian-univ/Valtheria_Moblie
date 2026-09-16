import { Stack } from 'expo-router';

export default function OutilsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="portefeuille" />
      <Stack.Screen name="cashflow" />
      <Stack.Screen name="epargne" />
    </Stack>
  );
}