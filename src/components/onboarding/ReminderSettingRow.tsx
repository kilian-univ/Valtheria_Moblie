import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleProp, StyleSheet, TextStyle, View, ViewStyle } from 'react-native';

import AppText from '@/src/components/common/AppText';
import BottomSheet from '@/src/components/common/BottomSheet';
import Button from '@/src/components/common/Button';
import { palette, space } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { disableReminder, enableReminder, getReminderSettings, ReminderSettings } from '@/src/state/reminder';
import { formatTime, ReminderTime } from '@/src/utils/reminder';
import { track } from '@/src/utils/track';
import ReminderPicker from './ReminderPicker';

type ReminderSettingRowProps = {
  // Styles de ligne du profil (row, rowLeft, rowLabel)
  rowStyle: StyleProp<ViewStyle>;
  leftStyle: StyleProp<ViewStyle>;
  labelStyle: StyleProp<TextStyle>;
};

// Réglage du profil : changer l'heure du rappel quotidien, ou le couper
export default function ReminderSettingRow({ rowStyle, leftStyle, labelStyle }: ReminderSettingRowProps) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const [settings, setSettings] = useState<ReminderSettings | null>(null);
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [time, setTime] = useState<ReminderTime | null>(null);
  const [busy, setBusy] = useState(false);
  const [refused, setRefused] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getReminderSettings().then(setSettings);
    }, [])
  );

  const openSheet = () => {
    if (!settings) return;
    setTime(settings.time);
    setRefused(false);
    setMounted(true);
    setOpen(true);
  };

  const save = async () => {
    if (!time) return;
    setBusy(true);
    const granted = await enableReminder(time);
    setBusy(false);
    if (!granted) {
      setRefused(true);
      return;
    }
    track('rappel_active', { heure: time.hour, minute: time.minute, depuis: 'profil' });
    setSettings({ enabled: true, time });
    setOpen(false);
  };

  const turnOff = async () => {
    setBusy(true);
    await disableReminder();
    setBusy(false);
    setSettings((s) => (s ? { ...s, enabled: false } : s));
    setOpen(false);
  };

  const value = settings ? (settings.enabled ? formatTime(settings.time) : 'Coupé') : '';

  return (
    <>
      <Pressable
        style={rowStyle}
        onPress={openSheet}
        accessibilityRole="button"
        accessibilityLabel={`Rappel quotidien, ${value}`}
      >
        <View style={leftStyle}>
          <Ionicons name="notifications-outline" size={18} color={colors.subtitle} />
          <AppText style={labelStyle}>Rappel quotidien</AppText>
        </View>
        <AppText variant="callout" tone="subtitle">
          {value}
        </AppText>
      </Pressable>

      {mounted && time ? (
        <BottomSheet open={open} onRequestClose={() => setOpen(false)} onClosed={() => setMounted(false)}>
          <View style={styles.sheet}>
            <AppText variant="title3" accessibilityRole="header">
              Rappel quotidien
            </AppText>
            <AppText variant="callout" tone="subtitle">
              Un seul rappel par jour, jamais plus.
            </AppText>
            <ReminderPicker value={time} onChange={setTime} />
            {refused ? (
              <AppText variant="callout" tone="subtitle" accessibilityRole="alert">
                Les notifications sont coupées pour Valtheria. Autorise-les dans les réglages du téléphone.
              </AppText>
            ) : null}
            <Button label={settings?.enabled ? 'Enregistrer' : 'Activer mon rappel'} onPress={save} loading={busy} />
            {settings?.enabled ? <Button variant="textDanger" label="Couper le rappel" onPress={turnOff} /> : null}
          </View>
        </BottomSheet>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  sheet: {
    gap: space[4],
    paddingHorizontal: space[5],
    paddingBottom: space[2],
  },
});
