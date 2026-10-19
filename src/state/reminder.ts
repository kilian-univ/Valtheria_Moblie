import AsyncStorage from '@react-native-async-storage/async-storage';
import type * as NotificationsModule from 'expo-notifications';
import { Platform } from 'react-native';

import { localDay } from '@/src/utils/day';
import { DEFAULT_REMINDER, lessonDoneToday, REMINDER_DAYS_AHEAD, ReminderTime, reminderMessageFor, upcomingReminders } from '@/src/utils/reminder';
import { REMINDER_SOUND_FILE, reminderSound } from '@/src/utils/soundRules';
import { lastObjective } from './objective';
import { onboardingStore } from './onboarding';

// Rappel quotidien en notifications LOCALES (rien côté serveur). Un seul
// rappel par jour, jamais plus. Pour que le texte change chaque jour, on
// programme les 30 prochains jours (REMINDER_DAYS_AHEAD), chacun avec son
// texte, et on reprogramme à chaque ouverture de l'app (refreshReminder) et
// à chaque fin de leçon (reminderAfterLesson) : le jour où la leçon est
// faite, aucun rappel ne part, les suivants repartent du lendemain. Après
// 30 jours sans ouvrir l'app, il n'y a plus de rappel (docs/rappels.md). Ses
// notifications portent l'identifiant « rappel-… » : les reprogrammer
// n'efface pas le rappel du budget (« budget-… », state/budgetReminder.ts).

const KEY = 'valtheria:rappel';
// Jour local de la dernière leçon terminée sur ce téléphone
const KEY_LAST_LESSON = 'valtheria:rappel:derniere-lecon';
const CHANNEL = 'rappel-quotidien';

export type ReminderSettings = { enabled: boolean; time: ReminderTime };

const DEFAULT_SETTINGS: ReminderSettings = { enabled: false, time: DEFAULT_REMINDER };

// expo-notifications est chargé à la demande (au lancement, pour écouter les
// rappels touchés), jamais par un import : s'il manque ou échoue (module
// natif absent), le rappel est simplement indisponible et l'app s'ouvre
// normalement.
let loaded: typeof NotificationsModule | null | undefined;

const OWN_PREFIX = 'rappel-';
// Notifications d'un autre rappel (budget) : jamais annulées par celui-ci
const OTHER_PREFIXES = ['budget-'];

export function notifications(): typeof NotificationsModule | null {
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

// Annule les notifications de ce rappel (et les anciennes, sans identifiant
// connu), jamais celles d'un autre rappel
async function cancelOwn(Notifications: typeof NotificationsModule): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of scheduled) {
    const id = n.identifier ?? '';
    if (OTHER_PREFIXES.some((p) => id.startsWith(p))) continue;
    await Notifications.cancelScheduledNotificationAsync(id);
  }
}

async function lastLessonDay(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(KEY_LAST_LESSON);
  } catch {
    return null;
  }
}

async function schedule(Notifications: typeof NotificationsModule, time: ReminderTime): Promise<void> {
  await cancelOwn(Notifications);
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
  // Leçon du jour déjà faite : le premier rappel est demain
  const now = new Date();
  for (const date of upcomingReminders(now, time, REMINDER_DAYS_AHEAD, lessonDoneToday(await lastLessonDay(), now))) {
    const { title, body } = reminderMessageFor(date, objective);
    await Notifications.scheduleNotificationAsync({
      identifier: `${OWN_PREFIX}${date.toISOString()}`,
      content: { title, body, sound: reminderSound(), data: { target: 'apprendre' } },
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
    const Notifications = notifications();
    if (Notifications) await cancelOwn(Notifications);
  } catch {
    // rien de programmé : sans conséquence
  }
  await saveSettings({ ...settings, enabled: false });
}

// À chaque ouverture : prolonge les rappels de 30 jours (textes renouvelés)
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

// Fin d'une leçon : le jour est noté, et les rappels repartent de demain
// (celui d'aujourd'hui, s'il n'était pas encore passé, est annulé)
export async function reminderAfterLesson(now: Date = new Date()): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY_LAST_LESSON, localDay(now));
  } catch {
    // stockage indisponible : le rappel du jour partira, sans autre conséquence
  }
  await refreshReminder();
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
  await AsyncStorage.multiRemove([KEY, KEY_LAST_LESSON]).catch(() => {});
}

// Toucher un rappel ouvre l'accueil d'Apprendre (décision du 17 octobre
// 2026) ; celui du budget ouvre Mon budget (data.target). Y compris quand
// l'app était fermée (réponse du lancement, effacée une fois traitée).
// Renvoie de quoi arrêter l'écoute.
type TapResponse = { notification?: { request?: { content?: { data?: Record<string, unknown> | null } } } } | null;
const targetOf = (r: TapResponse): string | null => {
  const t = r?.notification?.request?.content?.data?.target;
  return typeof t === 'string' ? t : null;
};

export function onReminderTapped(open: (target: string | null) => void): () => void {
  if (Platform.OS === 'web') return () => {};
  const Notifications = notifications();
  if (!Notifications) return () => {};
  try {
    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (!response) return;
        open(targetOf(response as TapResponse));
        return Notifications.clearLastNotificationResponseAsync();
      })
      .catch(() => {});
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      open(targetOf(response as TapResponse));
      Notifications.clearLastNotificationResponseAsync().catch(() => {});
    });
    return () => sub.remove();
  } catch {
    return () => {};
  }
}
