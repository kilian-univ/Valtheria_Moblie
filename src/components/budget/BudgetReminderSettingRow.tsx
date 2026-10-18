import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Linking, Pressable, StyleProp, StyleSheet, TextStyle, View, ViewStyle } from 'react-native';

import AppText from '@/src/components/common/AppText';
import BottomSheet from '@/src/components/common/BottomSheet';
import Button from '@/src/components/common/Button';
import { fonts, palette, radius, space } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import {
  budgetReminderLabel,
  disableBudgetReminder,
  enableBudgetReminder,
  getBudgetReminder,
  WEEKDAYS,
  type BudgetReminder,
} from '@/src/state/budgetReminder';
import { select } from '@/src/utils/haptics';

const HOURS = [8, 12, 18, 20];
// Ordre d'affichage : lundi d'abord (numéros des notifications : 1 = dimanche)
const DAY_ORDER = [2, 3, 4, 5, 6, 7, 1];

type Props = { rowStyle: StyleProp<ViewStyle>; leftStyle: StyleProp<ViewStyle>; labelStyle: StyleProp<TextStyle>; iconSize?: number };

// Réglage : le rappel doux du budget, une fois par semaine (jour et heure), ou coupé
export default function BudgetReminderSettingRow({ rowStyle, leftStyle, labelStyle, iconSize = 18 }: Props) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const [settings, setSettings] = useState<BudgetReminder | null>(null);
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<BudgetReminder | null>(null);
  const [busy, setBusy] = useState(false);
  const [refused, setRefused] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getBudgetReminder().then(setSettings);
    }, [])
  );

  const save = async () => {
    if (!draft) return;
    setBusy(true);
    const ok = await enableBudgetReminder(draft.weekday, draft.hour);
    setBusy(false);
    if (!ok) {
      setRefused(true);
      return;
    }
    setSettings({ ...draft, enabled: true });
    setOpen(false);
  };

  const turnOff = async () => {
    setBusy(true);
    await disableBudgetReminder();
    setBusy(false);
    setSettings((s) => (s ? { ...s, enabled: false } : s));
    setOpen(false);
  };

  const value = settings ? budgetReminderLabel(settings) : '';
  const chip = (on: boolean) => [styles.chip, { backgroundColor: on ? colors.gold : colors.panelStrong }];
  const chipText = (on: boolean) => [styles.chipText, { color: on ? colors.onGold : colors.text }];

  return (
    <>
      <Pressable
        style={rowStyle}
        onPress={() => {
          if (!settings) return;
          setDraft(settings);
          setRefused(false);
          setMounted(true);
          setOpen(true);
        }}
        accessibilityRole="button"
        accessibilityLabel={`Rappel du budget, ${value}`}
      >
        <View style={leftStyle}>
          <Ionicons name="wallet-outline" size={iconSize} color={colors.subtitle} />
          <AppText style={labelStyle}>Rappel du budget</AppText>
        </View>
        <AppText variant="callout" tone="subtitle">
          {value}
        </AppText>
      </Pressable>

      {mounted && draft ? (
        <BottomSheet open={open} onRequestClose={() => setOpen(false)} onClosed={() => setMounted(false)}>
          <View style={styles.sheet}>
            <AppText variant="title3" accessibilityRole="header">
              Rappel du budget
            </AppText>
            <AppText variant="callout" tone="subtitle">
              Une fois par semaine : « Ton solde a peut-être bougé ? ». Jamais plus, et rien si tu l’ignores.
            </AppText>
            <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel="Jour">
              {DAY_ORDER.map((d) => (
                <Pressable
                  key={d}
                  onPress={() => {
                    select();
                    setDraft({ ...draft, weekday: d });
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: draft.weekday === d }}
                  aria-checked={draft.weekday === d}
                  accessibilityLabel={WEEKDAYS[d - 1]}
                  style={chip(draft.weekday === d)}
                >
                  <AppText style={chipText(draft.weekday === d)}>{WEEKDAYS[d - 1].slice(0, 3)}.</AppText>
                </Pressable>
              ))}
            </View>
            <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel="Heure">
              {HOURS.map((h) => (
                <Pressable
                  key={h}
                  onPress={() => {
                    select();
                    setDraft({ ...draft, hour: h });
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: draft.hour === h }}
                  aria-checked={draft.hour === h}
                  accessibilityLabel={`${h} heures`}
                  style={chip(draft.hour === h)}
                >
                  <AppText style={chipText(draft.hour === h)}>{h}{' '}h</AppText>
                </Pressable>
              ))}
            </View>
            {refused ? (
              <AppText variant="callout" tone="subtitle" accessibilityRole="alert">
                Les notifications sont coupées pour Valtheria. Autorise-les dans les réglages du téléphone.
              </AppText>
            ) : null}
            {refused ? <Button variant="secondary" label="Ouvrir les réglages du téléphone" onPress={() => Linking.openSettings().catch(() => {})} /> : null}
            <Button label={settings?.enabled ? 'Enregistrer' : 'Activer le rappel'} onPress={save} loading={busy} />
            {settings?.enabled ? <Button variant="textDanger" label="Couper le rappel" onPress={turnOff} /> : null}
          </View>
        </BottomSheet>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  sheet: { gap: space[4], paddingHorizontal: space[5], paddingBottom: space[2] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  chip: { minWidth: 44, minHeight: 44, paddingHorizontal: space[3], borderRadius: radius.md, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center' },
  chipText: { fontFamily: fonts.bodyBold, fontSize: 14 },
});
