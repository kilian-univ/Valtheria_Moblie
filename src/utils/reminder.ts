// Rappel quotidien : créneaux, heure, textes de Val qui changent d'un jour à
// l'autre. Fonctions pures, sans React : testables avec Node. La
// programmation des notifications vit dans state/reminder.

export type ReminderTime = { hour: number; minute: number };

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

// Textes du rappel : Val parle, un texte différent chaque jour
export const REMINDER_MESSAGES: readonly { title: string; body: string }[] = [
  { title: 'Val t’attend', body: 'Une minute pour une nouvelle leçon ? Ta série compte sur toi.' },
  { title: 'Petite pause argent ?', body: 'J’ai un nouveau déclic pour toi. Ça prend une minute.' },
  { title: 'C’est l’heure de Val', body: 'On continue ? Chaque jour compte pour ta série.' },
  { title: 'Une question pour toi', body: 'Tu sais où part vraiment ton argent ? Viens voir.' },
  { title: 'Ta série t’attend', body: 'Garde le rythme : une leçon et c’est réglé.' },
  { title: 'Val a préparé la suite', body: 'Un chiffre qui va te surprendre. Une minute, promis.' },
  { title: 'Un pas de plus', body: 'Ce que tu apprends aujourd’hui, tu le gardes pour toujours.' },
];

// Texte du jour : change chaque jour, revient au bout d'une semaine
export function reminderMessageFor(date: Date): { title: string; body: string } {
  const day = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000);
  return REMINDER_MESSAGES[((day % REMINDER_MESSAGES.length) + REMINDER_MESSAGES.length) % REMINDER_MESSAGES.length];
}

// Prochains rappels : un par jour à l'heure choisie, à partir de maintenant
// (aujourd'hui si l'heure n'est pas passée), `days` jours
export function upcomingReminders(now: Date, time: ReminderTime, days = 14): Date[] {
  const out: Date[] = [];
  const first = new Date(now.getFullYear(), now.getMonth(), now.getDate(), time.hour, time.minute, 0, 0);
  if (first.getTime() <= now.getTime()) first.setDate(first.getDate() + 1);
  for (let i = 0; i < days; i++) {
    const d = new Date(first);
    d.setDate(first.getDate() + i);
    out.push(d);
  }
  return out;
}
