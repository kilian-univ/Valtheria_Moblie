// Récompenses de la série : médailles par palier, gels de série, prochaine
// récompense, semaine en cours. Fonctions pures, sans React : testables avec
// Node. Sans compte, tout est recalculé à partir des jours de leçon du
// téléphone ; avec un compte, la série vient du serveur (pas de gel).

import { localDay } from './day';

export type Medal = { days: number; name: string };

export const MEDALS: readonly Medal[] = [
  { days: 3, name: 'Étincelle' },
  { days: 7, name: 'Feu de camp' },
  { days: 14, name: 'Brasier' },
  { days: 30, name: 'Flamme d’or' },
  { days: 60, name: 'Phénix' },
  { days: 100, name: 'Légende' },
];

// Un gel en atteignant 7 jours, puis un de plus tous les 7 jours, 2 au plus
export const FREEZE_EVERY = 7;
export const FREEZE_MAX = 2;

export type StreakHistory = {
  // Série en cours (tient jusqu'à minuit si la leçon du jour n'est pas faite)
  streak: number;
  // Meilleure série atteinte
  best: number;
  // Gels en réserve
  freezes: number;
  // Jours manqués sauvés par un gel
  frozenDays: string[];
  // Jours où un gel a été gagné
  freezeGainDays: string[];
  // Premier jour de leçon (null : aucune leçon)
  firstDay: string | null;
};

function addDays(date: Date, n: number): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() + n);
  return d;
}

function parseDay(day: string): Date {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// Rejoue la série jour par jour, du premier jour de leçon à aujourd'hui :
// jour avec leçon → +1 (gel gagné tous les 7 jours, 2 au plus) ; jour passé
// sans leçon → un gel est utilisé tout seul s'il en reste (la série continue),
// sinon la série repart à zéro. Aujourd'hui sans leçon ne compte pas encore.
export function simulateStreak(lessonDays: readonly string[], now: Date = new Date()): StreakHistory {
  const set = new Set(lessonDays);
  const sorted = [...set].filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
  const today = localDay(now);
  const history: StreakHistory = { streak: 0, best: 0, freezes: 0, frozenDays: [], freezeGainDays: [], firstDay: sorted[0] ?? null };
  if (!history.firstDay || history.firstDay > today) return history;

  for (let d = parseDay(history.firstDay); localDay(d) <= today; d = addDays(d, 1)) {
    const day = localDay(d);
    if (set.has(day)) {
      history.streak += 1;
      history.best = Math.max(history.best, history.streak);
      if (history.streak % FREEZE_EVERY === 0 && history.freezes < FREEZE_MAX) {
        history.freezes += 1;
        history.freezeGainDays.push(day);
      }
    } else if (day !== today) {
      if (history.streak > 0 && history.freezes > 0) {
        history.freezes -= 1;
        history.frozenDays.push(day);
      } else {
        history.streak = 0;
      }
    }
  }
  return history;
}

// « Ton gel a sauvé ta série hier. »
export function frozenYesterday(history: StreakHistory, now: Date = new Date()): boolean {
  return history.frozenDays.includes(localDay(addDays(now, -1)));
}

// ---------------------------------------------------------------------------
// Semaine en cours
// ---------------------------------------------------------------------------

export type WeekDayState = 'done' | 'frozen' | 'missed' | 'quiet' | 'today';

export type WeekDay = {
  // « L », « M »…
  letter: string;
  // Nom lu par le lecteur d'écran
  name: string;
  // done : jour de série ; frozen : sauvé par un gel ; missed : jour manqué
  // après le début ; quiet : avant le premier jour, ou à venir ; today :
  // aujourd'hui, pas encore de leçon
  state: WeekDayState;
  isToday: boolean;
};

const WEEK = [
  ['L', 'lundi'],
  ['M', 'mardi'],
  ['M', 'mercredi'],
  ['J', 'jeudi'],
  ['V', 'vendredi'],
  ['S', 'samedi'],
  ['D', 'dimanche'],
] as const;

// Semaine en cours, du lundi au dimanche
export function weekDays(lessonDays: readonly string[], now: Date = new Date()): WeekDay[] {
  const set = new Set(lessonDays);
  const history = simulateStreak(lessonDays, now);
  const frozen = new Set(history.frozenDays);
  const monday = addDays(now, -((now.getDay() + 6) % 7));
  const today = localDay(now);
  return WEEK.map(([letter, name], i) => {
    const day = localDay(addDays(monday, i));
    const isToday = day === today;
    let state: WeekDayState;
    if (set.has(day)) state = 'done';
    else if (isToday) state = 'today';
    else if (day > today || !history.firstDay || day < history.firstDay) state = 'quiet';
    else state = frozen.has(day) ? 'frozen' : 'missed';
    return { letter, name, state, isToday };
  });
}

// ---------------------------------------------------------------------------
// Médailles et prochaine récompense
// ---------------------------------------------------------------------------

// Médailles gagnées : gardées même si la série casse (meilleure série)
export function earnedMedals(best: number): Medal[] {
  return MEDALS.filter((m) => best >= m.days);
}

export function nextMedal(streak: number): Medal | null {
  return MEDALS.find((m) => m.days > streak) ?? null;
}

export function daysLabel(n: number): string {
  return `${n} ${n > 1 ? 'jours' : 'jour'}`;
}

// Ligne de la carte « Ta série » sous la semaine
export function nextRewardLabel(streak: number): string {
  if (streak <= 0) return 'Termine une leçon pour allumer ta flamme';
  const medal = nextMedal(streak);
  if (!medal) return 'Ta flamme est à son maximum';
  return `${medal.name} dans ${daysLabel(medal.days - streak)}`;
}

export type MedalProgress = {
  // Médaille visée (après 100 jours : la dernière, gagnée)
  medal: Medal;
  earned: boolean;
  // Remplissage de la barre, de 0 à 1, entre le palier précédent et le visé
  ratio: number;
  label: string;
};

// Barre de la carte « Ta série » : progression du palier précédent (0 au
// départ) au prochain. 1 jour : 1 sur 3 vers Étincelle ; 5 jours : 2 sur 4
// (de 3 à 7) vers Feu de camp. 0 jour : vide ; 100 et plus : pleine.
export function medalProgress(streak: number): MedalProgress {
  const label = nextRewardLabel(streak);
  const next = nextMedal(Math.max(0, streak));
  if (!next) return { medal: MEDALS[MEDALS.length - 1], earned: true, ratio: 1, label };
  if (streak <= 0) return { medal: next, earned: false, ratio: 0, label };
  const previous = [...MEDALS].reverse().find((m) => m.days <= streak)?.days ?? 0;
  return { medal: next, earned: false, ratio: (streak - previous) / (next.days - previous), label };
}

// « 1 gel », « 2 gels »
export function freezesLabel(n: number): string {
  return `${n} ${n > 1 ? 'gels' : 'gel'}`;
}

// Médaille à fêter en fin de leçon : le plus haut palier franchi par cette
// leçon (série d'avant < palier ≤ série d'après) et jamais fêté. crossed :
// tous les paliers franchis, à mémoriser comme fêtés.
export function medalToCelebrate(
  from: number,
  to: number,
  celebrated: readonly number[]
): { medal: Medal | null; crossed: number[] } {
  const crossed = MEDALS.filter((m) => from < m.days && m.days <= to).map((m) => m.days);
  const pending = MEDALS.filter((m) => crossed.includes(m.days) && !celebrated.includes(m.days));
  return { medal: pending[pending.length - 1] ?? null, crossed };
}

// Paliers mémorisés (fêtés) : connus, sans doublon, dans l'ordre
export function cleanMedalDays(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  const known = new Set(MEDALS.map((m) => m.days));
  return [...new Set(raw.filter((d): d is number => typeof d === 'number' && known.has(d)))].sort((a, b) => a - b);
}

// ---------------------------------------------------------------------------
// Développement : séries longues simulées
// ---------------------------------------------------------------------------

// n jours de leçon d'affilée finissant hier (avant-hier si missYesterday :
// hier devient un jour manqué, sauvé par un gel s'il y en a)
export function simulatedLessonDays(n: number, now: Date = new Date(), missYesterday = false): string[] {
  const end = missYesterday ? -2 : -1;
  return Array.from({ length: n }, (_, i) => localDay(addDays(now, end - (n - 1 - i))));
}
