import { ApiProvider } from '@/src/context/ApiContext';
import { Stack } from 'expo-router';
import { ThemeProvider as NavigationThemeProvider } from 'expo-router/react-navigation';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { View } from 'react-native';
import 'react-native-reanimated';

import AnimatedSplash from '@/src/components/splash/AnimatedSplash';
import { palette } from '@/src/constants/style/Style';
import { CustomDarkTheme, CustomLightTheme } from '@/src/constants/theme';
import { ThemeProvider, useTheme } from '@/src/context/ThemeContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';

function RootLayoutContent() {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const [showSplash, setShowSplash] = useState(true);

  return (
    <NavigationThemeProvider value={colorScheme === 'dark' ? CustomDarkTheme : CustomLightTheme}>
      <ApiProvider>
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <Stack
            screenOptions={{
              headerShown: false,
              animation: 'fade',
              contentStyle: { backgroundColor: colors.background },
            }}
          >
            <Stack.Screen name="(tabs)" />
          </Stack>

          {showSplash && <AnimatedSplash onFinish={() => setShowSplash(false)} />}
        </View>
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