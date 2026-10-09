// Seul endroit qui connaît la forme des écrans renvoyée par GET /lessons/{id}
// (contrat : storage/app/audit/types-ecrans-reels.md du site, §2 et §7), et
// celle des univers (GET /modules → universe, GET /universes ; voir API.md du
// site). Transforme ces réponses en format interne (model.ts). Fonctions
// pures, sans React : testables avec Node.
//
// Champs volontairement ignorés : variant, has_volatile_note,
// volatile_verified_at, trap, trap_found, review, artifact, reveal.lines[].dim,
// et les zones « recap » des documents.

import type {
  ChoiceOption,
  DocumentLine,
  DocumentUpcoming,
  LessonModel,
  LessonScreen,
  RevealLine,
  Universe,
  UniverseRef,
  ValBlock,
  ValLine,
  ValMood,
} from './model';

type AnyRecord = Record<string, any>;

export const VAL_MOODS: readonly ValMood[] = [
  'neutre',
  'complice',
  'preoccupe',
  'determine',
  'alerte',
  'fier',
  'celebrant',
  'rassurant',
];

// Humeur absente ou inconnue → neutre
export function toMood(raw: unknown): ValMood {
  return typeof raw === 'string' && (VAL_MOODS as readonly string[]).includes(raw) ? (raw as ValMood) : 'neutre';
}

function isRecord(v: unknown): v is AnyRecord {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

// Le serveur n'autorise que <em> et <strong> : on garde le texte seul
export function plainText(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const text = raw.replace(/<\/?(em|strong)>/gi, '').trim();
  return text === '' ? null : text;
}

// Réplique de Val : <strong> / <em> deviennent le gras **…** de la bulle
function valText(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const text = raw.replace(/<\/?(em|strong)>/gi, '**').replace(/\*\*\*\*/g, '').trim();
  return text === '' ? null : text;
}

function valLine(raw: unknown): ValLine | null {
  if (!isRecord(raw)) return null;
  const line = valText(raw.line);
  return line ? { line, mood: toMood(raw.mood) } : null;
}

function valBlock(raw: unknown): ValBlock {
  const v = isRecord(raw) ? raw : {};
  return { intro: valLine(v.intro), correct: valLine(v.correct), wrong: valLine(v.wrong) };
}

function num(raw: unknown): number | null {
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : null;
}

function str(raw: unknown): string | null {
  if (typeof raw === 'number' && Number.isFinite(raw)) return String(raw);
  return plainText(raw);
}

function documentLine(raw: AnyRecord): DocumentLine {
  const hasId = raw.id !== undefined && raw.id !== null && String(raw.id) !== '';
  return {
    id: hasId ? String(raw.id) : null,
    libelle: plainText(raw.libelle) ?? '',
    date: str(raw.date),
    sousLibelle: plainText(raw.sous_libelle),
    montant: num(raw.montant),
    type: typeof raw.type === 'string' ? raw.type : 'normale',
    revelation: plainText(raw.revelation),
    correct: raw.correct === true,
  };
}

function upcoming(raw: unknown): DocumentUpcoming[] {
  if (typeof raw === 'string') {
    const libelle = plainText(raw);
    return libelle ? [{ date: null, libelle, montant: null }] : [];
  }
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(isRecord)
    .map((a) => ({ date: str(a.date), libelle: plainText(a.libelle) ?? '', montant: num(a.montant) }))
    .filter((a) => a.libelle !== '');
}

export function normalizeScreen(raw: unknown, index: number): LessonScreen {
  const s = isRecord(raw) ? raw : {};
  const p = isRecord(s.payload) ? s.payload : {};
  const type = typeof s.type === 'string' ? s.type : '';

  const base = {
    index,
    scored: s.scored === true,
    notion: typeof s.notion === 'string' ? s.notion : null,
    val: valBlock(s.val),
    explanation: plainText(s.explanation),
    question: plainText(p.question),
    subtitle: plainText(p.subtitle),
    source: { type: s.type, scored: s.scored, payload: s.payload },
  };

  switch (type) {
    case 'choice': {
      const options: ChoiceOption[] = (Array.isArray(p.options) ? p.options : [])
        .filter(isRecord)
        .filter((o) => o.id !== undefined && o.id !== null)
        .map((o) => ({ id: String(o.id), text: plainText(o.text) ?? '', correct: o.correct === true }));
      return { ...base, kind: 'choice', multiple: p.mode === 'multiple', options };
    }

    case 'document': {
      const entete = isRecord(p.entete) ? p.entete : {};
      // Seules les lignes du relevé sont affichées (pas les cellules « recap »)
      const lines = (Array.isArray(p.lines) ? p.lines : [])
        .filter(isRecord)
        .filter((l) => (l.zone ?? 'ligne') === 'ligne')
        .map(documentLine);
      const solde = isRecord(p.solde) ? { libelle: plainText(p.solde.libelle) ?? 'Solde', montant: num(p.solde.montant) } : null;
      return {
        ...base,
        kind: 'document',
        mode: p.mode === 'select' ? 'select' : 'pick',
        header: {
          etablissement: plainText(entete.etablissement),
          numero: plainText(entete.numero),
          periode: plainText(entete.periode),
          ibanMasque: plainText(entete.iban_masque),
        },
        lines,
        solde,
        aVenir: upcoming(p.a_venir),
      };
    }

    case 'reveal': {
      const value = num(p.value);
      if (value === null) break;
      const lines: RevealLine[] = (Array.isArray(p.lines) ? p.lines : [])
        .filter(isRecord)
        .map((l) => ({
          label: plainText(l.label) ?? '',
          value: num(l.value) ?? str(l.value) ?? '',
          key: l.key === true,
        }));
      const decimals = Number.isInteger(p.decimals) && p.decimals >= 0 && p.decimals <= 4 ? p.decimals : 0;
      return {
        ...base,
        kind: 'reveal',
        value,
        unit: plainText(p.unit),
        decimals,
        label: plainText(p.label),
        lines,
        fromScreen: Number.isInteger(p.from_screen) ? p.from_screen : null,
      };
    }

    case 'slider': {
      const min = num(p.min);
      const max = num(p.max);
      if (min === null || max === null || max <= min) break;
      const step = num(p.step) !== null && p.step > 0 ? p.step : 1;
      const start = num(p.start) ?? min;
      return {
        ...base,
        kind: 'slider',
        min,
        max,
        step,
        start: Math.min(max, Math.max(min, start)),
        unit: plainText(p.unit),
        answer: num(p.answer),
      };
    }
  }

  // number, dialogue, allocate, live_month, type inconnu ou écran mal formé
  return { ...base, kind: 'unsupported', type: type || 'inconnu', payload: s.payload };
}

// Réponse de GET /lessons/{id} (déjà sortie de l'enveloppe { data } par
// ApiContext), ou directement la liste des écrans
export function normalizeLesson(data: unknown): LessonModel {
  const d = isRecord(data) ? data : {};
  const rawScreens: unknown[] = Array.isArray(data) ? data : Array.isArray(d.screens) ? d.screens : [];
  return {
    title: plainText(d.title),
    screens: rawScreens.map((s, i) => normalizeScreen(s, i)),
  };
}

// ---------------------------------------------------------------------------
// Type d'étape du chemin (GET /modules → lessons[].kind). Préparé pour le
// serveur, qui ne l'envoie pas encore : absent ou inconnu → 'lesson'.
// ---------------------------------------------------------------------------
export type StepKind = 'lesson' | 'review' | 'challenge' | 'case';
const STEP_KINDS: readonly StepKind[] = ['lesson', 'review', 'challenge', 'case'];

export function stepKind(lesson: unknown): StepKind {
  const kind = isRecord(lesson) ? lesson.kind : undefined;
  return typeof kind === 'string' && (STEP_KINDS as readonly string[]).includes(kind) ? (kind as StepKind) : 'lesson';
}

// ---------------------------------------------------------------------------
// Univers. GET /modules → module.universe : { id, slug, name } ou null (absent
// tant que le serveur ne l'envoie pas). GET /universes → liste (déjà sortie de
// l'enveloppe { data } par ApiContext).
// ---------------------------------------------------------------------------
function id(raw: unknown): number | null {
  return Number.isInteger(raw) && (raw as number) > 0 ? (raw as number) : null;
}

// Univers d'un module ; absent, null ou mal formé → null
export function moduleUniverse(module: unknown): UniverseRef | null {
  const u = isRecord(module) ? module.universe : undefined;
  if (!isRecord(u)) return null;
  const universeId = id(u.id);
  const name = plainText(u.name);
  if (universeId === null || !name) return null;
  return { id: universeId, slug: typeof u.slug === 'string' ? u.slug : '', name };
}

// Liste des univers, triée par position (puis id). Les entrées mal formées
// sont écartées ; une réponse qui n'est pas une liste → aucun univers.
export function normalizeUniverses(data: unknown): Universe[] {
  if (!Array.isArray(data)) return [];
  return data
    .filter(isRecord)
    .map((u) => ({
      id: id(u.id),
      slug: typeof u.slug === 'string' ? u.slug : '',
      name: plainText(u.name),
      description: plainText(u.description),
      position: Number.isInteger(u.position) ? (u.position as number) : 0,
      moduleIds: (Array.isArray(u.module_ids) ? u.module_ids : []).map(id).filter((m): m is number => m !== null),
    }))
    .filter((u): u is Universe => u.id !== null && u.name !== null)
    .sort((a, b) => a.position - b.position || a.id - b.id);
}
