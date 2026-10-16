// États des mots du Dictionnaire et leur place dans la révision, sans
// React : testables avec Node. La mémoire est dans state/wordStates.ts, par
// utilisateur (et sans compte).
//
// - Pas encore vu : aucune trace ;
// - Vu : fiche ouverte au moins une fois ;
// - Maîtrisé : test réussi (sur la fiche ou en révision). Un mot maîtrisé
//   raté en révision redevient « Vu ».
//
// Révision : un mot vu (pas encore maîtrisé) y entre au moins 2 jours après
// avoir été vu ; un mot raté revient dès le lendemain ; un mot maîtrisé
// revient de temps en temps (7 jours, puis 21). Un mot pas encore vu n'y
// entre jamais.


export type WordState = 'nouveau' | 'vu' | 'maitrise';

export type WordRecord = {
  // Terme tel qu'affiché
  term: string;
  // Première ouverture de la fiche (ISO)
  seenAt: string;
  // Test réussi (ISO), null si pas (ou plus) maîtrisé
  masteredAt: string | null;
  // Dernier test (fiche ou révision) : instant et résultat
  last: { at: string; correct: boolean } | null;
  // Révisions réussies depuis la maîtrise (espacement : 7 puis 21 jours)
  streak: number;
};

export type WordMemory = Record<string, WordRecord>;

// Clé d'un mot : sans accents ni casse
export function wordKey(term: string): string {
  return term
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function wordState(memory: WordMemory, term: string): WordState {
  const r = memory[wordKey(term)];
  if (!r) return 'nouveau';
  return r.masteredAt ? 'maitrise' : 'vu';
}

// Fiche ouverte : le mot devient « Vu » (rien ne change s'il l'était déjà)
export function markSeen(memory: WordMemory, term: string, now: Date): WordMemory {
  const key = wordKey(term);
  if (!key || memory[key]) return memory;
  return { ...memory, [key]: { term: term.trim(), seenAt: now.toISOString(), masteredAt: null, last: null, streak: 0 } };
}

// Résultat d'un test (fiche ou révision) : réussi → maîtrisé (une révision
// réussie d'un mot déjà maîtrisé allonge l'espacement) ; raté → « Vu » (un
// mot maîtrisé le redevient)
export function markResult(memory: WordMemory, term: string, correct: boolean, now: Date): WordMemory {
  const key = wordKey(term);
  if (!key) return memory;
  const at = now.toISOString();
  const before = memory[key] ?? { term: term.trim(), seenAt: at, masteredAt: null, last: null, streak: 0 };
  const next: WordRecord = correct
    ? { ...before, masteredAt: before.masteredAt ?? at, last: { at, correct }, streak: before.masteredAt ? before.streak + 1 : 0 }
    : { ...before, masteredAt: null, last: { at, correct }, streak: 0 };
  return { ...memory, [key]: next };
}

// Mots vus avant cette version (liste « découverts ») : vus depuis longtemps
export const LONG_AGO = '2000-01-01T00:00:00.000Z';

export function migrateDiscovered(memory: WordMemory, discovered: readonly string[]): WordMemory {
  let out = memory;
  for (const term of discovered) {
    const key = wordKey(term);
    if (key && !out[key]) out = { ...out, [key]: { term: term.trim(), seenAt: LONG_AGO, masteredAt: null, last: null, streak: 0 } };
  }
  return out;
}

// Fusion (mémoire sans compte reprise par un compte) : pour chaque mot, la
// plus ancienne ouverture, et le dernier test
export function mergeWords(base: WordMemory, extra: WordMemory): WordMemory {
  const out: WordMemory = { ...base };
  for (const [key, r] of Object.entries(extra)) {
    const b = out[key];
    if (!b) {
      out[key] = r;
      continue;
    }
    const newer = (r.last?.at ?? '') > (b.last?.at ?? '') ? r : b;
    out[key] = { ...newer, seenAt: b.seenAt < r.seenAt ? b.seenAt : r.seenAt };
  }
  return out;
}

export function parseWords(raw: unknown): WordMemory {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: WordMemory = {};
  for (const [key, v] of Object.entries(raw as Record<string, unknown>)) {
    const r = v as Partial<WordRecord>;
    if (!r || typeof r.term !== 'string' || typeof r.seenAt !== 'string') continue;
    out[key] = {
      term: r.term,
      seenAt: r.seenAt,
      masteredAt: typeof r.masteredAt === 'string' ? r.masteredAt : null,
      last: r.last && typeof r.last.at === 'string' ? { at: r.last.at, correct: r.last.correct === true } : null,
      streak: typeof r.streak === 'number' && r.streak >= 0 ? r.streak : 0,
    };
  }
  return out;
}

// ---------------------------------------------------------------------------
// Compteurs et filtre de la liste
// ---------------------------------------------------------------------------

export type WordFilter = 'tous' | 'nouveaux' | 'vus' | 'maitrises';

export const WORD_FILTERS: readonly { key: WordFilter; label: string }[] = [
  { key: 'tous', label: 'Tous' },
  { key: 'nouveaux', label: 'À découvrir' },
  { key: 'vus', label: 'Vus' },
  { key: 'maitrises', label: 'Maîtrisés' },
];

export function matchesFilter(state: WordState, filter: WordFilter): boolean {
  if (filter === 'tous') return true;
  if (filter === 'nouveaux') return state === 'nouveau';
  if (filter === 'vus') return state === 'vu';
  return state === 'maitrise';
}

// Mots encore au dictionnaire : vus (maîtrisés compris : ils ont été vus) et
// maîtrisés. Dictionnaire pas encore chargé : toute la mémoire.
export function wordCounts(memory: WordMemory, terms: readonly string[] | null): { seen: number; mastered: number } {
  const known = terms && terms.length > 0 ? new Set(terms.map(wordKey)) : null;
  const list = Object.entries(memory).filter(([key]) => !known || known.has(key));
  return { seen: list.length, mastered: list.filter(([, r]) => r.masteredAt).length };
}

// « 12 vus · 4 maîtrisés »
export function wordCountsLabel(c: { seen: number; mastered: number }): string {
  return `${c.seen} ${c.seen >= 2 ? 'vus' : 'vu'} · ${c.mastered} ${c.mastered >= 2 ? 'maîtrisés' : 'maîtrisé'}`;
}

// État lu sous le titre de la fiche et par le lecteur d'écran
export function wordStateLabel(state: WordState): string {
  return state === 'maitrise' ? 'Maîtrisé' : state === 'vu' ? 'Vu' : 'Pas encore vu';
}

// ---------------------------------------------------------------------------
// Révision
// ---------------------------------------------------------------------------

// Délais avant le retour en révision (jours)
export const WORD_SEEN_DELAY = 2;
export const WORD_FAILED_DELAY = 1;
export const WORD_MASTERED_DELAYS = [7, 21] as const;

function daysBetween(fromIso: string, today: string): number {
  const from = new Date(fromIso);
  const [y, m, d] = today.split('-').map(Number);
  const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const b = Date.UTC(y, m - 1, d);
  return Math.round((b - a) / 86400000);
}

export type DueWord = {
  term: string;
  // Raté au dernier test
  failed: boolean;
  // Dernier passage (ouverture ou test), pour classer du plus ancien au plus récent
  lastSeen: string;
};

// Mots dus en révision aujourd'hui, ratés d'abord, puis du plus ancien au
// plus récent ; seulement ceux encore au dictionnaire (terms)
export function dueWords(memory: WordMemory, terms: readonly string[], today: string): DueWord[] {
  const known = new Map(terms.map((t) => [wordKey(t), t]));
  const out: DueWord[] = [];
  for (const [key, r] of Object.entries(memory)) {
    const term = known.get(key);
    if (!term) continue;
    const lastAt = r.last?.at ?? r.seenAt;
    let due: boolean;
    if (r.masteredAt) {
      const delay = WORD_MASTERED_DELAYS[Math.min(r.streak, WORD_MASTERED_DELAYS.length - 1)];
      due = daysBetween(lastAt, today) >= delay;
    } else if (r.last && !r.last.correct) {
      due = daysBetween(r.last.at, today) >= WORD_FAILED_DELAY;
    } else {
      due = daysBetween(r.seenAt, today) >= WORD_SEEN_DELAY;
    }
    if (due) out.push({ term, failed: !!r.last && !r.last.correct, lastSeen: lastAt });
  }
  return out.sort((a, b) => (a.failed !== b.failed ? (a.failed ? -1 : 1) : a.lastSeen < b.lastSeen ? -1 : a.lastSeen > b.lastSeen ? 1 : 0));
}

