import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import AppText from '@/src/components/common/AppText';
import { fonts, opacityDim, palette, space } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import type { CycleCharge } from '@/src/utils/budget/calc';
import { NBSP } from '@/src/utils/frenchSpaces';
import { signedEuros } from '@/src/utils/budget/format';

// « Ce qui va encore partir » (maquette, écran 1) : les charges fixes du
// cycle de paie, dans l'ordre ; celles déjà passées sont cochées et estompées.
export default function ChargeList({ charges }: { charges: CycleCharge[] }) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  return (
    <View>
      {charges.map((c, i) => (
        <View
          key={c.id}
          style={[styles.row, { borderBottomColor: colors.border, opacity: c.done ? opacityDim : 1 }, i === charges.length - 1 && styles.last]}
          accessible
          accessibilityLabel={`${c.label}, ${signedEuros(-c.amount)}, le ${c.day}${c.done ? ', déjà passé' : ''}`}
        >
          <AppText variant="caption" tone="subtitle" style={styles.day}>
            le{NBSP}
            {c.day}
          </AppText>
          <AppText variant="body" style={styles.label} numberOfLines={2}>
            {c.label}
          </AppText>
          {c.done ? <Ionicons name="checkmark" size={16} color={colors.success} /> : null}
          <AppText variant="body" style={styles.amount}>
            {signedEuros(-c.amount)}
          </AppText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: 10, borderBottomWidth: 1, minHeight: 44 },
  last: { borderBottomWidth: 0 },
  day: { width: 44, textAlign: 'center' },
  label: { flex: 1 },
  amount: { fontFamily: fonts.bodyBold, fontVariant: ['tabular-nums'] },
});
