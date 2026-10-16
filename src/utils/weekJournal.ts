// Journal des leçons terminées et résumé de la semaine (graphique « CETTE
// SEMAINE » du profil), sans React : testables avec Node. La mémoire est dans
// state/weekJournal.ts, par utilisateur.

import { localDay } from './day';

export type JournalEntry = {
  // Jour local de la leçon (AAAA-MM-JJ) et instant exact (ISO)
  day: string;
  at: string;
  xp: number;
};

// On ne garde que les derniers mois : la semaine en cours suffit à l'écran
export const JOURNAL_MAX = 400;

export function journalEntry(now: Date, xp: number): JournalEntry {
  return { day: localDay(now), at: now.toISOString(), xp: Number.isFinite(xp) ? Math.max(0, Math.round(xp)) : 0 };
}

export function addJournalEntry(list: readonly JournalEntry[], entry: JournalEntry): JournalEntry[] {
  return [...list, entry].slice(-JOURNAL_MAX);
}

const INITIALS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'] as const;
const NAMES = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'] as const;

export type WeekDayBar = {
  day: string;
  initial: string;
  name: string;
  xp: number;
  lessons: number;
  isToday: boolean;
  isFuture: boolean;
};

export type WeekSummary = { days: WeekDayBar[]; totalXp: number; lessons: number; max: number };

// Semaine en cours, du lundi au dimanche
export function weekSummary(list: readonly JournalEntry[], now: Date): WeekSummary {
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const today = localDay(now);
  const days = INITIALS.map((initial, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const key = localDay(d);
    const own = list.filter((e) => e.day === key);
    return {
      day: key,
      initial,
      name: NAMES[i],
      xp: own.reduce((n, e) => n + e.xp, 0),
      lessons: own.length,
      isToday: key === today,
      isFuture: key > today,
    };
  });
  return {
    days,
    totalXp: days.reduce((n, d) => n + d.xp, 0),
    lessons: days.reduce((n, d) => n + d.lessons, 0),
    max: Math.max(0, ...days.map((d) => d.xp)),
  };
}

// Hauteur d'une barre (px) : proportionnelle au meilleur jour ; jour sans
// leçon : barre minimale
export function barHeight(xp: number, max: number, full: number, minimal: number): number {
  if (xp <= 0 || max <= 0) return minimal;
  return Math.max(minimal * 2, Math.round((xp / max) * full));
}
