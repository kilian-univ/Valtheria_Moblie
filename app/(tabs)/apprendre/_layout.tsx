import { Stack } from 'expo-router';

// Pile propre à l'onglet Apprendre : les pages univers et module s'empilent
// ici, donc la barre d'onglets reste visible. Le lecteur de leçon (app/apprendre/[id])
// vit dans la pile racine et passe, lui, par-dessus les onglets.
export default function ApprendreTabLayout() {
  return (
    // Transitions natives (glissement et geste retour sur iOS). L'accueil,
    // transparent, laisse voir le fond commun animé ; les pages poussées sont
    // opaques (OpaqueScreen) et ne laissent jamais voir celle du dessous.
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="univers/index" />
      <Stack.Screen name="univers/[universeId]" />
      <Stack.Screen name="module/[moduleId]" />
    </Stack>
  );
}
