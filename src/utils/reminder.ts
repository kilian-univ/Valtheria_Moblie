// Rappel quotidien : créneaux, heure, textes de Val qui changent d'un jour à
// l'autre. Fonctions pures, sans React : testables avec Node. La
// programmation des notifications vit dans state/reminder.

import { localDay } from './day';

export type ReminderTime = { hour: number; minute: number };

// Jours programmés d'avance à chaque ouverture (un texte différent par
// jour, donc une notification par jour). iOS n'accepte que 64 notifications
// en attente par app : 30 laissent la place au rappel du budget. Au-delà de
// 30 jours sans ouvrir l'app, il n'y a plus de rappel (voir docs/rappels.md).
export const REMINDER_DAYS_AHEAD = 30;

export const REMINDER_SLOTS: readonly { id: 'matin' | 'midi' | 'soir'; label: string; time: ReminderTime }[] = [
  { id: 'matin', label: 'Matin', time: { hour: 8, minute: 0 } },
  { id: 'midi', label: 'Midi', time: { hour: 12, minute: 30 } },
  { id: 'soir', label: 'Soir', time: { hour: 19, minute: 0 } },
];

export const DEFAULT_REMINDER: ReminderTime = REMINDER_SLOTS[2].time;

// « 8 h », « 12 h 30 » (espaces insécables)
export function formatTime({ hour, minute }: ReminderTime): string {
  return minute === 0 ? `${hour} h` : `${hour} h ${String(minute).padStart(2, '0')}`;
}

export function sameTime(a: ReminderTime, b: ReminderTime): boolean {
  return a.hour === b.hour && a.minute === b.minute;
}

export function clampTime(hour: number, minute: number): ReminderTime {
  const h = ((Math.round(hour) % 24) + 24) % 24;
  const m = ((Math.round(minute) % 60) + 60) % 60;
  return { hour: h, minute: m };
}

// Textes du rappel : Val parle, un texte différent chaque jour. Sans pression
// sur la série, sans durée (« une minute ») ni promesse (« pour toujours »)
// (audit G28)
export const REMINDER_MESSAGES: readonly { title: string; body: string }[] = [
  { title: 'Val t’attend', body: 'Une nouvelle leçon est prête, quand tu veux.' },
  { title: 'Petite pause argent ?', body: 'J’ai un nouveau déclic pour toi. C’est vite fait.' },
  { title: 'C’est l’heure de Val', body: 'On continue ? Une leçon, à ton rythme.' },
  { title: 'Une question pour toi', body: 'Tu sais où part vraiment ton argent ? Viens voir.' },
  { title: 'Une leçon t’attend', body: 'Un petit pas aujourd’hui, et c’est réglé.' },
  { title: 'Val a préparé la suite', body: 'Un chiffre qui va te surprendre. C’est court, promis.' },
  { title: 'Un pas de plus', body: 'Ce que tu apprends aujourd’hui, tu le gardes longtemps.' },
];

// Un texte par objectif, dans le ton de Val : la prochaine leçon du sujet
// choisi, jamais de morale
export const OBJECTIVE_REMINDERS: Readonly<Record<string, { title: string; body: string }>> = {
  epargner: { title: 'Val t’attend', body: 'Ta prochaine leçon sur l’épargne t’attend. Courte, promis.' },
  investir: { title: 'Val t’attend', body: 'Ta prochaine leçon sur l’investissement t’attend.' },
  crypto: { title: 'Val t’attend', body: 'Ta prochaine leçon sur la crypto t’attend. Sans le bruit autour.' },
  logement: { title: 'Val t’attend', body: 'Ta prochaine leçon sur le logement t’attend. Un pas de plus vers chez toi.' },
  impots: { title: 'Val t’attend', body: 'Ta prochaine leçon sur les impôts t’attend. Moins de mystère, promis.' },
  decouvrir: { title: 'Val t’attend', body: 'Un nouveau sujet t’attend. On le découvre ensemble ?' },
};

// Texte du jour : change chaque jour, revient au bout d'une semaine.
// Objectif connu : un jour sur deux, le texte de l'objectif.
export function reminderMessageFor(date: Date, objective?: string | null): { title: string; body: string } {
  const day = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000);
  const own = objective ? OBJECTIVE_REMINDERS[objective] : undefined;
  if (own && day % 2 === 0) return own;
  return REMINDER_MESSAGES[((day % REMINDER_MESSAGES.length) + REMINDER_MESSAGES.length) % REMINDER_MESSAGES.length];
}

// La leçon du jour est-elle déjà faite ? (jour local de la dernière leçon
// terminée sur ce téléphone, gardé par state/reminder)
export function lessonDoneToday(lastLessonDay: string | null | undefined, now: Date): boolean {
  return !!lastLessonDay && lastLessonDay === localDay(now);
}

// Prochains rappels : un par jour à l'heure choisie, à partir de maintenant
// (aujourd'hui si l'heure n'est pas passée), `days` jours. `skipToday` :
// la leçon du jour est faite, le premier rappel est demain.
export function upcomingReminders(now: Date, time: ReminderTime, days = REMINDER_DAYS_AHEAD, skipToday = false): Date[] {
  const out: Date[] = [];
  const first = new Date(now.getFullYear(), now.getMonth(), now.getDate(), time.hour, time.minute, 0, 0);
  if (skipToday || first.getTime() <= now.getTime()) first.setDate(first.getDate() + 1);
  for (let i = 0; i < days; i++) {
    const d = new Date(first);
    d.setDate(first.getDate() + i);
    out.push(d);
  }
  return out;
}

export type PlannedReminder = { date: Date; title: string; body: string };

// Ce que l'app programme exactement (state/reminder.ts, schedule) : une
// notification par jour avec son texte, aucune le jour où la leçon est déjà
// faite (le premier rappel est alors demain), `days` jours d'avance
export function plannedReminders(
  now: Date,
  time: ReminderTime,
  lastLessonDay: string | null | undefined,
  objective?: string | null,
  days = REMINDER_DAYS_AHEAD
): PlannedReminder[] {
  return upcomingReminders(now, time, days, lessonDoneToday(lastLessonDay, now)).map((date) => ({ date, ...reminderMessageFor(date, objective) }));
}
