import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { ComponentProps } from 'react';
import { ColorValue } from 'react-native';

import { palette, textVariants } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';

type IconName = ComponentProps<typeof Ionicons>['name'];

// Icônes contour du Design System, de la même graisse pour les quatre onglets
function tabIcon(name: IconName) {
  return function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <Ionicons name={name} size={size} color={color} />;
  };
}

export default function TabLayout() {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: colors.subtitle,
        tabBarLabelStyle: {
          fontFamily: textVariants.tabLabel.style.fontFamily,
          fontSize: textVariants.tabLabel.style.fontSize,
        },
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          borderTopWidth: 1,
        },
        sceneStyle: { backgroundColor: colors.background },
      }}>
      <Tabs.Screen name="apprendre" options={{ title: 'Apprendre', tabBarIcon: tabIcon('school-outline') }} />
      <Tabs.Screen name="dictionary" options={{ title: 'Dictionnaire', tabBarIcon: tabIcon('book-outline') }} />
      <Tabs.Screen name="article" options={{ title: 'Articles', tabBarIcon: tabIcon('newspaper-outline') }} />
      <Tabs.Screen name="outils" options={{ title: 'Outils', tabBarIcon: tabIcon('stats-chart-outline') }} />
    </Tabs>
  );
}
