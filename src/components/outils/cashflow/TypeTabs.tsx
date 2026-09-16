import { Pressable, Text, View } from 'react-native';

type TabKey = 'revenus' | 'depenses' | 'epargne';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'revenus', label: 'Revenus' },
  { key: 'depenses', label: 'Dépenses' },
  { key: 'epargne', label: 'Épargne' },
];

export default function TypeTabs({
  active,
  onChange,
  styles,
}: {
  active: TabKey;
  onChange: (key: TabKey) => void;
  styles: any;
}) {
  return (
    <View style={styles.tabsWrap}>
      {TABS.map((tab) => {
        const isActive = active === tab.key;
        return (
          <Pressable key={tab.key} onPress={() => onChange(tab.key)} style={isActive ? styles.tabItemActive : styles.tabItem}>
            <Text style={isActive ? styles.tabTextActive : styles.tabText}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export type { TabKey };
