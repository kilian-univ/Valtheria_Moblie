import { Text, View } from 'react-native';

type CategoryTotal = { category: string; total: number; color: string };

export default function CategoryBreakdown({
  items,
  styles,
}: {
  items: CategoryTotal[];
  styles: any;
}) {
  if (items.length === 0) return null;

  const max = Math.max(...items.map((i) => i.total), 1);

  return (
    <View style={styles.breakdownCard}>
      <Text style={styles.breakdownTitle}>Répartition des dépenses</Text>
      {items
        .slice()
        .sort((a, b) => b.total - a.total)
        .map((item) => (
          <View key={item.category} style={styles.breakdownRow}>
            <View style={styles.breakdownRowHeader}>
              <Text style={styles.breakdownCategoryText}>{item.category}</Text>
              <Text style={styles.breakdownTotalText}>{item.total.toLocaleString('fr-FR')} €</Text>
            </View>
            <View style={styles.breakdownTrack}>
              <View
                style={[
                  styles.breakdownFill,
                  { width: `${(item.total / max) * 100}%`, backgroundColor: item.color },
                ]}
              />
            </View>
          </View>
        ))}
    </View>
  );
}