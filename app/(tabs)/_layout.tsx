import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { BottomTabBar, type BottomTabBarProps } from 'expo-router/tabs';
import { ComponentProps } from 'react';
import { ColorValue, View } from 'react-native';

import EmailConfirmBanner from '@/src/components/account/EmailConfirmBanner';

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

// Barre des onglets, avec au-dessus le bandeau « Confirme ton adresse e-mail »
// tant que l'adresse n'est pas confirmée (visible sur les quatre onglets)
function TabBar(props: BottomTabBarProps) {
  return (
    <View>
      <EmailConfirmBanner />
      <BottomTabBar {...props} />
    </View>
  );
}

export default function TabLayout() {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];

  return (
    <Tabs
      // Rendue comme un composant : la navigation appelle tabBar comme une simple fonction
      tabBar={(props) => <TabBar {...props} />}
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
        // Onglet quitté : figé (animations en boucle à l'arrêt)
        freezeOnBlur: true,
      }}>
      {TAB_ROUTES.map((tab) => (
        <Tabs.Screen key={tab.name} name={tab.name} options={{ title: tab.title, tabBarIcon: tabIcon(tab.icon) }} />
      ))}
    </Tabs>
  );
}
