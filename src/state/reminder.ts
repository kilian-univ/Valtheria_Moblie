import AsyncStorage from '@react-native-async-storage/async-storage';
import type * as NotificationsModule from 'expo-notifications';
import { Platform } from 'react-native';

import { DEFAULT_REMINDER, ReminderTime, reminderMessageFor, upcomingReminders } from '@/src/utils/reminder';
import { REMINDER_SOUND_FILE, reminderSound } from '@/src/utils/soundRules';
import { lastObjective } from './objective';
import { onboardingStore } from './onboarding';

// Rappel quotidien en notifications LOCALES (rien côté serveur). Un seul
// rappel par jour, jamais plus. Pour que le texte change chaque jour, on
// programme les 14 prochains jours, chacun avec son texte, et on
// reprogramme à chaque ouverture de l'app (refreshReminder).

const KEY = 'valtheria:rappel';
const CHANNEL = 'rappel-quotidien';
const DAYS_AHEAD = 14;

export type ReminderSettings = { enabled: boolean; time: ReminderTime };

const DEFAULT_SETTINGS: ReminderSettings = { enabled: false, time: DEFAULT_REMINDER };

// expo-notifications n'est chargé qu'au premier besoin, jamais au lancement :
// s'il manque ou échoue (Expo Go, module natif absent), le rappel est
// simplement indisponible et l'app s'ouvre normalement.
let loaded: typeof NotificationsModule | null | undefined;

function notifications(): typeof NotificationsModule | null {
  if (loaded !== undefined) return loaded;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod: typeof NotificationsModule = require('expo-notifications');
    // Notification reçue app ouverte : affichée quand même
    mod.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
    loaded = mod;
  } catch {
    loaded = null;
  }
  return loaded;
}

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

async function schedule(Notifications: typeof NotificationsModule, time: ReminderTime): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'Rappel quotidien',
      importance: Notifications.AndroidImportance.DEFAULT,
      // Son personnalisé du rappel, s'il est livré (voir soundRules.ts)
      ...(REMINDER_SOUND_FILE ? { sound: REMINDER_SOUND_FILE } : {}),
    });
  }
  // Objectif connu (profil, sinon première ouverture) : un jour sur deux,
  // le rappel en parle
  const objective = (await lastObjective()) ?? (await onboardingStore.load()).objective;
  for (const date of upcomingReminders(new Date(), time, DAYS_AHEAD)) {
    const { title, body } = reminderMessageFor(date, objective);
    await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: reminderSound() },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId: CHANNEL },
    });
  }
}

// Autorisation accordée, ou provisoire sur iOS (notifications discrètes)
function allowed(p: { granted: boolean; ios?: { status?: number } | null }, Notifications: typeof NotificationsModule): boolean {
  return p.granted || p.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}

// Demande l'autorisation, puis programme le rappel. false : refusé (rien
// n'est programmé, le réglage reste coupé).
export async function enableReminder(time: ReminderTime): Promise<boolean> {
  try {
    const Notifications = notifications();
    if (!Notifications) return false;
    const current = await Notifications.getPermissionsAsync();
    const granted = allowed(current, Notifications) || allowed(await Notifications.requestPermissionsAsync(), Notifications);
    if (!granted) return false;
    await schedule(Notifications, time);
    await saveSettings({ enabled: true, time });
    return true;
  } catch {
    return false;
  }
}

export async function disableReminder(): Promise<void> {
  const settings = await getReminderSettings();
  try {
    await notifications()?.cancelAllScheduledNotificationsAsync();
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
    const Notifications = notifications();
    if (!Notifications) return;
    const permission = await Notifications.getPermissionsAsync();
    if (allowed(permission, Notifications)) await schedule(Notifications, settings.time);
    // Autorisation retirée dans les réglages du téléphone : rien n'arrivera
    // plus, le rappel est affiché « Coupé » au lieu d'une heure trompeuse
    else await saveSettings({ ...settings, enabled: false });
  } catch {
    // échec de programmation : on réessaiera à la prochaine ouverture
  }
}

// Réglage affiché, vérifié contre l'autorisation du téléphone
export async function getCheckedReminderSettings(): Promise<ReminderSettings> {
  await refreshReminder();
  return getReminderSettings();
}

// Développement (« Tout réinitialiser ») : rappel coupé et réglage effacé
export async function resetReminder(): Promise<void> {
  try {
    await notifications()?.cancelAllScheduledNotificationsAsync();
  } catch {
    // rien de programmé : sans conséquence
  }
  await AsyncStorage.removeItem(KEY).catch(() => {});
}
