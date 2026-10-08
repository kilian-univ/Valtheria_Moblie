import { Fraunces_500Medium } from '@expo-google-fonts/fraunces/500Medium';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { ApiProvider } from '@/src/context/ApiContext';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { ThemeProvider as NavigationThemeProvider } from 'expo-router/react-navigation';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import { View } from 'react-native';
import 'react-native-reanimated';

import { SkeletonProvider } from '@/src/components/common/Skeleton';
import LaunchScreen from '@/src/components/splash/LaunchScreen';
import { palette } from '@/src/constants/style/Style';
import { CustomDarkTheme, CustomLightTheme } from '@/src/constants/theme';
import { ThemeProvider, useTheme } from '@/src/context/ThemeContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Le splash natif (fond #0D0D0F + logo, voir app.json) reste affiché tant que
// les polices ne sont pas chargées ; LaunchScreen prend ensuite le relais au
// même endroit, puis s'efface quand l'app est prête.
SplashScreen.preventAutoHideAsync();

function RootLayoutContent() {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const [showSplash, setShowSplash] = useState(true);
  const hideLaunchScreen = useCallback(() => setShowSplash(false), []);
  const [fontsLoaded, fontError] = useFonts({
    Fraunces_500Medium,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });
  // En cas d'erreur de chargement, on affiche l'app en police système plutôt que de bloquer
  const fontsReady = fontsLoaded || !!fontError;

  // Le splash natif est masqué par LaunchScreen lui-même, une fois sa vue
  // posée à l'écran : aucune image sans logo entre les deux.

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
              </Stack>
            )}

            {fontsReady && showSplash && <LaunchScreen onFinish={hideLaunchScreen} />}
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