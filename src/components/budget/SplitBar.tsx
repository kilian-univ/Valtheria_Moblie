import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import AppText from '@/src/components/common/AppText';
import { moduleColors, palette, space } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { NBSP } from '@/src/utils/frenchSpaces';

// Couleurs des trois familles du budget (maquette) : besoins en ardoise,
// envies en cuivre, épargne en or
export function familyColors(colors: (typeof palette)['dark']) {
  return { besoins: moduleColors.ardoise.face, envies: moduleColors.cuivre.face, epargne: colors.gold };
}

type Percents = { besoins: number; envies: number; epargne: number };

// « Ta répartition » : besoins, envies, épargne, avec les repères 50/30/20
// marqués sur la barre (à 50 % et à 80 %)
function SplitBar({ p }: { p: Percents }) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const tint = familyColors(colors);
  const parts: { key: keyof Percents; label: string }[] = [
    { key: 'besoins', label: 'Besoins' },
    { key: 'envies', label: 'Envies' },
    { key: 'epargne', label: 'Épargne' },
  ];
  return (
    <View
      accessible
      accessibilityLabel={`Ta répartition : besoins ${p.besoins} %, envies ${p.envies} %, épargne ${p.epargne} %. Les repères : 50, 30 et 20 %.`}
    >
      <View style={styles.bar}>
        {parts.map((x) => (p[x.key] > 0 ? <View key={x.key} style={{ flex: p[x.key], backgroundColor: tint[x.key] }} /> : null))}
      </View>
      <View style={styles.ticks}>
        <View style={[styles.tick, { left: '50%', backgroundColor: colors.text }]} />
        <View style={[styles.tick, { left: '80%', backgroundColor: colors.text }]} />
      </View>
      <View style={styles.legend}>
        {parts.map((x) => (
          <View key={x.key} style={styles.item}>
            <View style={[styles.dot, { backgroundColor: tint[x.key] }]} />
            <AppText variant="caption" tone="subtitle">
              {x.label} {p[x.key]}
              {NBSP}%
            </AppText>
          </View>
        ))}
      </View>
      <AppText variant="caption" tone="subtitle" style={styles.note}>
        Les repères : la règle courante 50 / 30 / 20.
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { height: 12, borderRadius: 999, overflow: 'hidden', flexDirection: 'row', gap: 2 },
  ticks: { height: 14 },
  tick: { position: 'absolute', top: 0, width: 2, height: 10, marginLeft: -1, opacity: 0.7 },
  legend: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: space[2] },
  item: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  note: { marginTop: space[1] },
});

// Mémorisé : redessiné seulement quand ses propriétés changent, pas à chaque
// rendu de l'écran qui le contient
export default memo(SplitBar);
