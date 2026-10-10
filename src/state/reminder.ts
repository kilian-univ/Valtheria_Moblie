import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { DEFAULT_REMINDER, ReminderTime, reminderMessageFor, upcomingReminders } from '@/src/utils/reminder';

// Rappel quotidien en notifications LOCALES (rien côté serveur). Un seul
// rappel par jour, jamais plus. Pour que le texte change chaque jour, on
// programme les 14 prochains jours, chacun avec son texte, et on
// reprogramme à chaque ouverture de l'app (refreshReminder).

const KEY = 'valtheria:rappel';
const CHANNEL = 'rappel-quotidien';
const DAYS_AHEAD = 14;

export type ReminderSettings = { enabled: boolean; time: ReminderTime };

const DEFAULT_SETTINGS: ReminderSettings = { enabled: false, time: DEFAULT_REMINDER };

// Notification reçue app ouverte : affichée quand même
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function getReminderSettings(): Promise<ReminderSettings> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    const t = parsed?.time;
    if (!parsed || typeof t?.hour !== 'number' || typeof t?.minute !== 'number') return DEFAULT_SETTINGS;
    return { enabled: parsed.enabled === true, time: { hour: t.hour, minute: t.minute } };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

async function saveSettings(settings: ReminderSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // stockage indisponible : le rappel reste programmé, sans conséquence
  }
}

async function schedule(time: ReminderTime): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'Rappel quotidien',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  for (const date of upcomingReminders(new Date(), time, DAYS_AHEAD)) {
    const { title, body } = reminderMessageFor(date);
    await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId: CHANNEL },
    });
  }
}

// Demande l'autorisation, puis programme le rappel. false : refusé (rien
// n'est programmé, le réglage reste coupé).
export async function enableReminder(time: ReminderTime): Promise<boolean> {
  try {
    const current = await Notifications.getPermissionsAsync();
    const granted = current.granted || (await Notifications.requestPermissionsAsync()).granted;
    if (!granted) return false;
    await schedule(time);
    await saveSettings({ enabled: true, time });
    return true;
  } catch {
    return false;
  }
}

export async function disableReminder(): Promise<void> {
  const settings = await getReminderSettings();
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // rien de programmé : sans conséquence
  }
  await saveSettings({ ...settings, enabled: false });
}

// À chaque ouverture : prolonge les rappels de 14 jours (textes renouvelés)
export async function refreshReminder(): Promise<void> {
  const settings = await getReminderSettings();
  if (!settings.enabled) return;
  try {
    const permission = await Notifications.getPermissionsAsync();
    if (permission.granted) await schedule(settings.time);
  } catch {
    // échec de programmation : on réessaiera à la prochaine ouverture
  }
}
