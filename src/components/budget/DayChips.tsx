import { useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import AppText from '@/src/components/common/AppText';
import { fonts, palette, radius, space } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { select } from '@/src/utils/haptics';

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
const CHIP = 44;

// Jour du mois (1 à 31) en pastilles qui défilent : paie, charge fixe.
// Le 31 vaut « le dernier jour » dans un mois plus court.
export default function DayChips({ value, onChange, label }: { value: number | null; onChange: (day: number) => void; label: string }) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const scroll = useRef<ScrollView>(null);
  // Le jour choisi est visible à l'ouverture
  useEffect(() => {
    if (value !== null) scroll.current?.scrollTo({ x: Math.max(0, (value - 3) * (CHIP + space[2])), animated: false });
  }, [value]);
  return (
    <ScrollView ref={scroll} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} accessibilityLabel={label}>
      {DAYS.map((d) => {
        const on = d === value;
        return (
          <Pressable
            key={d}
            onPress={() => {
              select();
              onChange(d);
            }}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            aria-checked={on}
            accessibilityLabel={d === 31 ? 'Le 31, ou le dernier jour du mois' : `Le ${d}`}
            style={[styles.chip, { backgroundColor: on ? colors.gold : colors.panelStrong }]}
          >
            <AppText maxFontSizeMultiplier={1.2} style={[styles.label, { color: on ? colors.onGold : colors.text }]}>
              {d}
            </AppText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: space[2], paddingVertical: 2 },
  chip: { width: CHIP, height: CHIP, borderRadius: radius.md, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center' },
  label: { fontFamily: fonts.bodyBold, fontSize: 16 },
});
