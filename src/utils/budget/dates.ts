// Dates du budget, en jours « AAAA-MM-JJ » (heure de Paris côté serveur,
// heure locale côté téléphone) : jamais d'heure, donc jamais de décalage de
// fuseau. Fonctions pures, testables avec Node.

export type Day = string; // « 2026-10-18 »

const MS_DAY = 86_400_000;

function parts(day: Day): [number, number, number] {
  const [y, m, d] = day.split('-').map(Number);
  return [y, m, d];
}

function utc(day: Day): number {
  const [y, m, d] = parts(day);
  return Date.UTC(y, m - 1, d);
}

function fromUtc(ms: number): Day {
  return new Date(ms).toISOString().slice(0, 10);
}

export function isDay(v: unknown): v is Day {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

// Aujourd'hui sur le téléphone
export function localToday(now: Date = new Date()): Day {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function addDays(day: Day, n: number): Day {
  return fromUtc(utc(day) + n * MS_DAY);
}

// Nombre de jours de a à b (b − a)
export function daysBetween(a: Day, b: Day): number {
  return Math.round((utc(b) - utc(a)) / MS_DAY);
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

// Le jour « day » d'un mois, ramené au dernier jour si le mois est plus court
// (une paie le 31 tombe le 30 en novembre)
export function dayOfMonth(year: number, month: number, day: number): Day {
  const d = Math.min(Math.max(1, day), daysInMonth(year, month));
  return `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function monthOf(day: Day): { year: number; month: number } {
  const [y, m] = parts(day);
  return { year: y, month: m };
}

// « 2026-10 »
export function monthKey(day: Day): string {
  return day.slice(0, 7);
}

export function shiftMonth(year: number, month: number, n: number): { year: number; month: number } {
  const i = year * 12 + (month - 1) + n;
  return { year: Math.floor(i / 12), month: (i % 12) + 1 };
}

export function firstOfMonth(day: Day): Day {
  return `${day.slice(0, 7)}-01`;
}

export function lastOfMonth(day: Day): Day {
  const { year, month } = monthOf(day);
  return dayOfMonth(year, month, 31);
}

// Première date > after qui tombe le jour « day » d'un mois
export function nextOccurrence(day: number, after: Day): Day {
  const { year, month } = monthOf(after);
  for (let i = 0; i < 3; i++) {
    const m = shiftMonth(year, month, i);
    const d = dayOfMonth(m.year, m.month, day);
    if (d > after) return d;
  }
  return dayOfMonth(shiftMonth(year, month, 2).year, shiftMonth(year, month, 2).month, day);
}

// Dernière date <= onOrBefore qui tombe le jour « day » d'un mois
export function lastOccurrence(day: number, onOrBefore: Day): Day {
  const { year, month } = monthOf(onOrBefore);
  for (let i = 0; i < 3; i++) {
    const m = shiftMonth(year, month, -i);
    const d = dayOfMonth(m.year, m.month, day);
    if (d <= onOrBefore) return d;
  }
  return dayOfMonth(shiftMonth(year, month, -2).year, shiftMonth(year, month, -2).month, day);
}

// Dates qui tombent le jour « day », strictement entre from et to
export function occurrencesBetween(day: number, from: Day, to: Day): Day[] {
  const out: Day[] = [];
  let d = nextOccurrence(day, from);
  while (d < to) {
    out.push(d);
    d = nextOccurrence(day, d);
  }
  return out;
}

const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const MONTHS_SHORT = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

export function monthName(month: number): string {
  return MONTHS[month - 1] ?? '';
}

// « Octobre 2026 »
export function monthTitle(year: number, month: number): string {
  const name = monthName(month);
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${year}`;
}

// « 16 oct. »
export function shortDay(day: Day): string {
  const [, m, d] = parts(day);
  return `${d === 1 ? '1er' : d} ${MONTHS_SHORT[m - 1]}`;
}

// « 31 octobre »
export function longDay(day: Day): string {
  const [, m, d] = parts(day);
  return `${d === 1 ? '1er' : d} ${MONTHS[m - 1]}`;
}

// « aujourd'hui », « hier », « il y a 3 jours »
export function agoLabel(days: number): string {
  if (days <= 0) return 'aujourd’hui';
  if (days === 1) return 'hier';
  return `il y a ${days} jours`;
}
