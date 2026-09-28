import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { palette } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';

export default function TabLayout() {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.gold,
        headerShown: false,
        // tabBarButton: HapticTab,
        tabBarStyle: { backgroundColor: colors.background },
        sceneStyle: { backgroundColor: colors.background },
      }}>
      <Tabs.Screen
        name="apprendre"
        options={{
          title: 'Apprendre',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="book" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="dictionary"
        options={{
          title: 'Dictionnaire',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="journal" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="article"
        options={{
          title: 'Articles',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="folder" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="outils"
        options={{
          title: 'Outils',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="construct-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}