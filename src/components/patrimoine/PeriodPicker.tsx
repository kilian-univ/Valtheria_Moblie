import { Pressable, StyleSheet, View } from 'react-native';

import AppText from '@/src/components/common/AppText';
import { fonts, palette, radius } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { PERIODS, periodSpoken, type Period } from '@/src/utils/patrimoine/chart';
import { select } from '@/src/utils/haptics';

// Périodes 1J, 1S, 1M, YTD, 1A, 5A, Tout : la période choisie en or
export default function PeriodPicker({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  return (
    <View style={styles.row} accessibilityRole="tablist" accessibilityLabel="Période">
      {PERIODS.map((p) => {
        const active = p === value;
        return (
          <Pressable
            key={p}
            onPress={() => {
              if (active) return;
              select();
              onChange(p);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={periodSpoken(p)}
            hitSlop={{ top: 6, bottom: 6 }}
            style={({ pressed }) => [
              styles.chip,
              active && { backgroundColor: colors.gold },
              pressed && !active && { backgroundColor: colors.surface2 },
            ]}
          >
            <AppText maxFontSizeMultiplier={1.2} style={[styles.label, { color: active ? colors.onGold : colors.subtitle }]}>
              {p}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 4 },
  chip: {
    flex: 1,
    height: 32,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontFamily: fonts.bodyBold, fontSize: 12 },
});
