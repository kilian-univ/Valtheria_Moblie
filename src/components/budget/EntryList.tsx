import { Pressable, StyleSheet, View } from 'react-native';

import AppText from '@/src/components/common/AppText';
import { fonts, palette, space } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { categoryLabel } from '@/src/utils/budget/categories';
import { addDays, shortDay, type Day } from '@/src/utils/budget/dates';
import { signedEuros } from '@/src/utils/budget/format';
import type { BudgetCategory, Entry } from '@/src/utils/budget/model';
import { tap } from '@/src/utils/haptics';

const when = (on: Day, today: Day) => (on === today ? 'aujourd’hui' : on === addDays(today, -1) ? 'hier' : shortDay(on));

// Dernières dépenses et rentrées notées (maquette, écran 4) ; toucher une
// ligne la modifie ou la supprime
export default function EntryList({ entries, categories, today, onOpen }: { entries: Entry[]; categories: BudgetCategory[]; today: Day; onOpen: (e: Entry) => void }) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  return (
    <View>
      {entries.map((e, i) => {
        const color = e.type === 'revenu' ? colors.success : (categories.find((c) => c.name === e.category)?.color ?? colors.subtitle);
        const kind = e.type === 'revenu' ? 'Rentrée' : categoryLabel(e.category);
        const amount = signedEuros(e.type === 'revenu' ? e.amount : -e.amount);
        return (
          <Pressable
            key={e.id}
            onPress={() => {
              tap();
              onOpen(e);
            }}
            accessibilityRole="button"
            accessibilityLabel={`${e.label}, ${kind}, ${when(e.on, today)}, ${amount}`}
            accessibilityHint="Modifier ou supprimer"
            style={({ pressed }) => [styles.row, { borderBottomColor: colors.border, opacity: pressed ? 0.7 : 1 }, i === entries.length - 1 && styles.last]}
          >
            <View style={[styles.dot, { backgroundColor: color }]} />
            <View style={styles.flex}>
              <AppText variant="body" numberOfLines={1}>
                {e.label}
              </AppText>
              <AppText variant="caption" tone="subtitle">
                {kind} · {when(e.on, today)}
              </AppText>
            </View>
            <AppText variant="body" style={[styles.amount, e.type === 'revenu' && { color: colors.success }]}>
              {amount}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: 9, borderBottomWidth: 1, minHeight: 52 },
  last: { borderBottomWidth: 0 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  flex: { flex: 1 },
  amount: { fontFamily: fonts.bodyBold, fontVariant: ['tabular-nums'] },
});
