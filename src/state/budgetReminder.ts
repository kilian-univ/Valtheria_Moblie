import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import { reminderSound, REMINDER_SOUND_FILE } from '@/src/utils/soundRules';
import { notifications } from './reminder';

// Rappel doux du budget, une fois par semaine, en notification LOCALE :
// « Ton solde a peut-être bougé ? ». Jour et heure réglables dans les
// Réglages, désactivable. Aucune série, aucune relance s'il est ignoré.
// Identifiant « budget-solde » : le rappel quotidien ne l'efface jamais.

const KEY = 'valtheria:rappel-budget';
const ID = 'budget-solde';
const CHANNEL = 'rappel-budget';

// weekday : 1 = dimanche … 7 = samedi (convention des notifications)
export type BudgetReminder = { enabled: boolean; weekday: number; hour: number };

export const DEFAULT_BUDGET_REMINDER: BudgetReminder = { enabled: false, weekday: 1, hour: 18 };

export const WEEKDAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'] as const;

// « Le dimanche à 18 h »
export function budgetReminderLabel(r: BudgetReminder): string {
  return r.enabled ? `Le ${WEEKDAYS[r.weekday - 1]} à ${r.hour} h` : 'Coupé';
}

export async function getBudgetReminder(): Promise<BudgetReminder> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const p = raw ? JSON.parse(raw) : null;
    if (!p || !Number.isInteger(p.weekday) || p.weekday < 1 || p.weekday > 7 || !Number.isInteger(p.hour) || p.hour < 0 || p.hour > 23) {
      return DEFAULT_BUDGET_REMINDER;
    }
    return { enabled: p.enabled === true, weekday: p.weekday, hour: p.hour };
  } catch {
    return DEFAULT_BUDGET_REMINDER;
  }
}

async function save(r: BudgetReminder) {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(r));
  } catch {
    // stockage indisponible : le rappel reste programmé
  }
}

async function cancel() {
  try {
    await notifications()?.cancelScheduledNotificationAsync(ID);
  } catch {
    // rien de programmé
  }
}

// Demande l'autorisation puis programme ; false si refusée (rien n'est programmé)
export async function enableBudgetReminder(weekday: number, hour: number): Promise<boolean> {
  try {
    const N = notifications();
    if (!N || Platform.OS === 'web') return false;
    const current = await N.getPermissionsAsync();
    const ok = (p: { granted: boolean; ios?: { status?: number } | null }) => p.granted || p.ios?.status === N.IosAuthorizationStatus.PROVISIONAL;
    if (!ok(current) && !ok(await N.requestPermissionsAsync())) return false;
    if (Platform.OS === 'android') {
      await N.setNotificationChannelAsync(CHANNEL, {
        name: 'Rappel du budget',
        importance: N.AndroidImportance.DEFAULT,
        ...(REMINDER_SOUND_FILE ? { sound: REMINDER_SOUND_FILE } : {}),
      });
    }
    await cancel();
    await N.scheduleNotificationAsync({
      identifier: ID,
      content: { title: 'Mon budget', body: 'Ton solde a peut-être bougé ? Un chiffre suffit.', sound: reminderSound(), data: { target: 'budget' } },
      trigger: { type: N.SchedulableTriggerInputTypes.WEEKLY, weekday, hour, minute: 0, channelId: CHANNEL },
    });
    await save({ enabled: true, weekday, hour });
    return true;
  } catch {
    return false;
  }
}

export async function disableBudgetReminder(): Promise<void> {
  const r = await getBudgetReminder();
  await cancel();
  await save({ ...r, enabled: false });
}
