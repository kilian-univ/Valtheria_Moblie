import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { ComponentProps } from 'react';
import { ColorValue } from 'react-native';

import { palette, textVariants } from '@/src/constants/style/Style';
import { TAB_ROUTES } from '@/src/constants/tabs';
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
        // Transparent : le fond commun (AppBackground) se voit derrière
        sceneStyle: { backgroundColor: 'transparent' },
      }}>
      {TAB_ROUTES.map((tab) => (
        <Tabs.Screen key={tab.name} name={tab.name} options={{ title: tab.title, tabBarIcon: tabIcon(tab.icon) }} />
      ))}
    </Tabs>
  );
}
