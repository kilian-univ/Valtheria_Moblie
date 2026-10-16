import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import AppText from '@/src/components/common/AppText';
import BottomSheet from '@/src/components/common/BottomSheet';
import Button from '@/src/components/common/Button';
import IconButton from '@/src/components/common/IconButton';
import { fonts, palette, radius, space } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { select, tap } from '@/src/utils/haptics';
import { longDate } from '@/src/utils/patrimoine/format';
import { dayOf, isoDay, stepDay, type Day } from '@/src/utils/patrimoine/forms';

const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

// Date d'une opération : le champ affiche « 2 juin 2026 » ; le toucher ouvre
// une feuille à trois crans (jour, mois, année), jamais après aujourd'hui.
export default function DateField({ value, onChange, label = 'Date' }: { value: Day; onChange: (d: Day) => void; label?: string }) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const shown = longDate(`${isoDay(value)}T12:00:00`);

  const step = (field: 'd' | 'm' | 'y', delta: number) => {
    select();
    setDraft((d) => stepDay(d, field, delta, dayOf(new Date())));
  };

  return (
    <View style={styles.wrap}>
      <AppText variant="caption" tone="subtitle">
        {label}
      </AppText>
      <Pressable
        onPress={() => {
          tap();
          setDraft(value);
          setMounted(true);
          setOpen(true);
        }}
        accessibilityRole="button"
        accessibilityLabel={`${label} : ${shown}`}
        accessibilityHint="Choisir une autre date"
        style={({ pressed }) => [styles.field, { backgroundColor: colors.surface, borderColor: colors.controlBorder }, pressed && { opacity: 0.8 }]}
      >
        <AppText style={styles.value}>{shown}</AppText>
      </Pressable>

      {mounted ? (
        <BottomSheet open={open} onRequestClose={() => setOpen(false)} onClosed={() => setMounted(false)}>
          <View style={styles.sheet}>
            <AppText variant="title3" accessibilityRole="header" style={styles.center}>
              Date de l’opération
            </AppText>
            <View style={styles.steppers}>
              <Stepper label="jour" value={String(draft.d)} onMinus={() => step('d', -1)} onPlus={() => step('d', 1)} />
              <Stepper label="mois" value={MONTHS[draft.m - 1]} onMinus={() => step('m', -1)} onPlus={() => step('m', 1)} />
              <Stepper label="année" value={String(draft.y)} onMinus={() => step('y', -1)} onPlus={() => step('y', 1)} />
            </View>
            <Button
              label={`Valider le ${longDate(`${isoDay(draft)}T12:00:00`)}`}
              onPress={() => {
                onChange(draft);
                setOpen(false);
              }}
            />
          </View>
        </BottomSheet>
      ) : null}
    </View>
  );
}

function Stepper({ label, value, onMinus, onPlus }: { label: string; value: string; onMinus: () => void; onPlus: () => void }) {
  return (
    <View style={styles.stepper}>
      <IconButton icon="chevron-up" onPress={onPlus} accessibilityLabel={`${label} suivant`} />
      <AppText maxFontSizeMultiplier={1.2} style={styles.stepValue} accessibilityLabel={`${label} : ${value}`}>
        {value}
      </AppText>
      <IconButton icon="chevron-down" onPress={onMinus} accessibilityLabel={`${label} précédent`} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, gap: 6 },
  field: {
    minHeight: 54,
    borderRadius: radius.option,
    borderCurve: 'continuous',
    borderWidth: 1.5,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  value: { fontFamily: fonts.bodyMedium, fontSize: 16 },
  sheet: { gap: space[4], paddingTop: space[4] },
  center: { textAlign: 'center' },
  steppers: { flexDirection: 'row', justifyContent: 'space-around' },
  stepper: { alignItems: 'center', gap: 2, minWidth: 80 },
  stepValue: { fontFamily: fonts.title, fontSize: 26, lineHeight: 32 },
});
