import { Fraunces_500Medium } from '@expo-google-fonts/fraunces/500Medium';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { ApiProvider } from '@/src/context/ApiContext';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { ThemeProvider as NavigationThemeProvider } from 'expo-router/react-navigation';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import 'react-native-reanimated';

import { SkeletonProvider } from '@/src/components/common/Skeleton';
import StartupGate from '@/src/components/splash/StartupGate';
import { palette } from '@/src/constants/style/Style';
import { CustomDarkTheme, CustomLightTheme } from '@/src/constants/theme';
import { ThemeProvider, useTheme } from '@/src/context/ThemeContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Démarrage : le splash natif (fond + logo, voir app.json) reste jusqu'à ce
// que l'app soit prête (polices + session lue sur le téléphone), puis se
// masque en fondu ; l'accueil est déjà là dessous, avec son squelette.
// Tout est géré par StartupGate.

function RootLayoutContent() {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const [fontsLoaded, fontError] = useFonts({
    Fraunces_500Medium,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  // En cas d'erreur de chargement, on affiche l'app en police système plutôt que de bloquer
  const fontsReady = fontsLoaded || !!fontError;

  return (
    <NavigationThemeProvider value={colorScheme === 'dark' ? CustomDarkTheme : CustomLightTheme}>
      <ApiProvider>
        {/* Une seule animation de reflet, partagée par tous les squelettes */}
        <SkeletonProvider>
          <View style={{ flex: 1, backgroundColor: colors.background }}>
            {fontsReady && (
              <Stack
                screenOptions={{
                  headerShown: false,
                  animation: 'fade',
                  contentStyle: { backgroundColor: colors.background },
                }}
              >
                <Stack.Screen name="(tabs)" />
                {/* Pile du lecteur de leçon : le balayage retour iOS la fermerait */}
                <Stack.Screen name="apprendre" options={{ gestureEnabled: false }} />
              </Stack>
            )}

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