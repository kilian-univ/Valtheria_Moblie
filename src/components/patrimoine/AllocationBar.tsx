import { StyleSheet, View } from 'react-native';

import AppText from '@/src/components/common/AppText';
import { palette } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { roundedShares, type Share } from '@/src/utils/patrimoine/analysis';

// Couleurs des parts, dans l'ordre (par type ou par risque)
export function shareColors(colors: (typeof palette)['dark']): Record<string, string> {
  return {
    actions: colors.chart3,
    epargne: colors.gold,
    crypto: colors.chart4,
    matieres: colors.chart5,
    autres: colors.chart2,
    sans_risque: colors.success,
    modere: colors.chart3,
    eleve: colors.chart2,
    tres_eleve: colors.error,
    non_classe: colors.textFaint,
  };
}

// Barre de répartition et sa légende (« Actions et ETF 45 % »)
export default function AllocationBar<K extends string>({ shares }: { shares: Share<K>[] }) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const tints = shareColors(colors);
  const list = roundedShares(shares);
  const spoken = list.map((s) => `${s.label} ${s.percent} %`).join(', ');
  return (
    <View accessible accessibilityLabel={`Répartition : ${spoken}`}>
      <View style={styles.bar}>
        {list.map((s) => (
          <View key={s.key} style={{ flex: Math.max(s.share, 0.005), backgroundColor: tints[s.key] ?? colors.subtitle }} />
        ))}
      </View>
      <View style={styles.legend}>
        {list.map((s) => (
          <View key={s.key} style={styles.item}>
            <View style={[styles.dot, { backgroundColor: tints[s.key] ?? colors.subtitle }]} />
            <AppText variant="caption" tone="subtitle">
              {s.label} {s.percent}{' '}%
            </AppText>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { height: 10, borderRadius: 999, overflow: 'hidden', flexDirection: 'row', gap: 2 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 6, marginTop: 8 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
