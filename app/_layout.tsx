import { Fraunces_500Medium } from '@expo-google-fonts/fraunces/500Medium';
import { Fraunces_500Medium_Italic } from '@expo-google-fonts/fraunces/500Medium_Italic';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { Inter_800ExtraBold } from '@expo-google-fonts/inter/800ExtraBold';
import { Inter_600SemiBold_Italic } from '@expo-google-fonts/inter/600SemiBold_Italic';
import { ApiProvider } from '@/src/context/ApiContext';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { ThemeProvider as NavigationThemeProvider } from 'expo-router/react-navigation';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import 'react-native-reanimated';

import AppBackground from '@/src/components/common/AppBackground';
import { SkeletonProvider } from '@/src/components/common/Skeleton';
import OnboardingGate from '@/src/components/onboarding/OnboardingGate';
import StartupGate from '@/src/components/splash/StartupGate';
import { VAL_SALUT_GLOW, valPose } from '@/src/components/common/ValFullBody';
import { LOGO } from '@/src/constants/brand';
import { VAULT_IMAGE } from '@/src/components/onboarding/VaultScene';
import { usePreloadedImages } from '@/src/hooks/usePreloadedImages';
import { palette } from '@/src/constants/style/Style';
import { CustomDarkTheme, CustomLightTheme } from '@/src/constants/theme';
import { ThemeProvider, useTheme } from '@/src/context/ThemeContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Démarrage : le splash natif (fond + logo, voir app.json) reste jusqu'à ce
// que l'app soit prête (polices + session lue sur le téléphone), puis se
// masque en fondu ; l'accueil est déjà là dessous, avec son squelette.
// Tout est géré par StartupGate.

// Images du tout premier écran (bienvenue : logo, Val, décor du coffre),
// chargées avant de le montrer
const STARTUP_IMAGES = [LOGO, valPose('salut').source, VAL_SALUT_GLOW, VAULT_IMAGE];

function RootLayoutContent() {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const [fontsLoaded, fontError] = useFonts({
    Fraunces_500Medium,
    Fraunces_500Medium_Italic,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    Inter_600SemiBold_Italic,
  });
  // Logo et Val de la bienvenue préchargés pendant le splash (0,8 s au plus)
  const imagesReady = usePreloadedImages(STARTUP_IMAGES);
  // En cas d'erreur de chargement, on affiche l'app en police système plutôt que de bloquer
  const fontsReady = (fontsLoaded || !!fontError) && imagesReady;

  return (
    <NavigationThemeProvider value={colorScheme === 'dark' ? CustomDarkTheme : CustomLightTheme}>
      <ApiProvider>
        {/* Une seule animation de reflet, partagée par tous les squelettes */}
        <SkeletonProvider>
          <View style={{ flex: 1, backgroundColor: colors.background }}>
            {/* Fond commun, une seule fois, derrière toute la navigation */}
            <AppBackground />
            {fontsReady && (
              <Stack
                screenOptions={{
                  headerShown: false,
                  // Transitions natives. Écrans transparents : le fond commun se
                  // voit derrière les onglets ; les pages poussées par-dessus
                  // sont opaques (OpaqueScreen).
                  contentStyle: { backgroundColor: 'transparent' },
                }}
              >
                <Stack.Screen name="(tabs)" />
                {/* Pile du lecteur de leçon : le balayage retour iOS la fermerait */}
                <Stack.Screen name="apprendre" options={{ gestureEnabled: false }} />
                {/* Première ouverture : rien derrière à quoi revenir par un balayage */}
                <Stack.Screen name="bienvenue" options={{ gestureEnabled: false }} />
              </Stack>
            )}
            {/* Première ouverture sans compte : reprise à l'étape mémorisée */}
            {fontsReady ? <OnboardingGate /> : null}

            <StartupGate fontsReady={fontsReady} />
          </View>
        </SkeletonProvider>
        <StatusBar style="auto" />
      </ApiProvider>
    </NavigationThemeProvider>
  );
}

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <RootLayoutContent />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}