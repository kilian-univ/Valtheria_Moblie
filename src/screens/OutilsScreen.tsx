import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import Header from '@/src/components/topbar/header';
import { palette } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';

type Tool = {
  key: string;
  title: string;
  description: string;
  icon: string;
  route: string;
};

const TOOLS: Tool[] = [
  {
    key: 'portefeuille',
    title: 'Portefeuille',
    description: 'Suis tes positions et leur évolution',
    icon: '📈',
    route: '/outils/portefeuille',
  },
  {
    key: 'cashflow',
    title: 'Cash-flow',
    description: 'Entrées et sorties, vue mensuelle',
    icon: '💸',
    route: '/outils/cashflow',
  },
  {
    key: 'epargne',
    title: 'Épargne',
    description: 'Objectifs et contributions',
    icon: '🎯',
    route: '/outils/epargne',
  },
];

export default function OutilsScreen() {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const router = useRouter();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header showBack={false} />

      <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }}>
        <Text style={{ color: colors.text, fontSize: 22, fontWeight: '800', marginBottom: 4 }}>
          Outils
        </Text>
        <Text style={{ color: colors.subtitle, fontSize: 14, marginBottom: 12 }}>
          Pilote tes finances au quotidien
        </Text>

        {TOOLS.map((tool) => (
          <Pressable
            key={tool.key}
            onPress={() => router.push(tool.route as any)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 14,
              padding: 16,
              borderRadius: 16,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                backgroundColor: colors.background,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 22 }}>{tool.icon}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 2 }}>
                {tool.title}
              </Text>
              <Text style={{ color: colors.subtitle, fontSize: 13 }}>{tool.description}</Text>
            </View>
            <Text style={{ color: colors.subtitle, fontSize: 18 }}>›</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}