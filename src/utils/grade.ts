/* =========================================================================
   Verdict d'un écran — PORTAGE À L'IDENTIQUE de resources/js/reader/grade.js
   du site (lui-même miroir de app/Services/Lesson/ScreenGrader.php).
   L'app l'utilise pour afficher la correction tout de suite ; le serveur
   recalcule tout à la fin de la leçon et fait foi.
   Cas partagés : tests/fixtures/reader-grading.json du site (node --test).
   Ne pas « améliorer » ce fichier : toute divergence avec le site est un bug.
   ========================================================================= */

// Écran tel que servi par l'API (forme du serveur, pas le modèle de l'app)
export type GradableScreen = { type?: unknown; scored?: unknown; payload?: unknown };

type AnyRecord = Record<string, any>;

export function parseNumber(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v !== 'string') return null;
  // espace, espace insécable (U+00A0), espace fine insécable (U+202F)
  const s = v.trim().replace(/[   ]/g, '').replace(/,/g, '.');
  return /^-?\d+(\.\d+)?$/.test(s) ? parseFloat(s) : null;
}

function correctIds(items: unknown): string[] {
  return (Array.isArray(items) ? items : [])
    .filter((it) => it && it.correct === true && it.id !== undefined && it.id !== null)
    .map((it) => String(it.id));
}

function sameSet(response: unknown, expected: string[]): boolean {
  const raw: unknown[] = Array.isArray(response)
    ? response
    : response === null || response === undefined
      ? []
      : [response];
  const given = [
    ...new Set(raw.filter((x) => typeof x === 'string' || typeof x === 'number').map(String)),
  ].sort();
  const exp = [...expected].sort();
  return exp.length > 0 && given.length === exp.length && given.every((g, i) => g === exp[i]);
}

function withinTolerance(response: unknown, p: AnyRecord): boolean {
  const v = parseNumber(response);
  const answer = parseNumber(p.answer ?? null);
  if (v === null || answer === null) return false;
  const tol = Math.abs(parseNumber(p.tolerance ?? 0) ?? 0);
  return Math.abs(v - answer) <= tol + 1e-9;
}

function dialogue(response: unknown, replies: unknown): boolean {
  if (!(typeof response === 'string' || (typeof response === 'number' && Number.isInteger(response)))) return false;
  const r = (Array.isArray(replies) ? replies : []).find((x) => x && String(x.id ?? '') === String(response));
  return !!r && r.correct === true;
}

function allocate(response: unknown, p: AnyRecord): boolean {
  const total = parseNumber(p.total ?? null);
  const buckets: AnyRecord[] = Array.isArray(p.buckets) ? p.buckets : [];
  if (total === null || buckets.length === 0 || !response || typeof response !== 'object' || Array.isArray(response))
    return false;
  const given = response as AnyRecord;
  let sum = 0;
  for (const b of buckets) {
    const target = parseNumber(b.target ?? null) ?? 0;
    if (b.locked === true) {
      sum += target;
      continue;
    }
    const v = parseNumber(given[b.key ?? ''] ?? null);
    const max = parseNumber(b.max ?? null) ?? total;
    if (v === null || v < 0 || v > max + 1e-9) return false;
    sum += v;
    if (Math.abs(v - target) > Math.abs(parseNumber(b.tolerance ?? 0) ?? 0) + 1e-9) return false;
  }
  return Math.abs(sum - total) <= 1e-6;
}

function liveMonth(response: unknown, p: AnyRecord): boolean {
  const choices = (Array.isArray(p.events) ? p.events : []).filter((ev: AnyRecord) => ev && Array.isArray(ev.options));
  if (!Array.isArray(response) || response.length !== choices.length) return false;
  return choices.every(
    (ev: AnyRecord, i: number) =>
      Number.isInteger(response[i]) && response[i] >= 0 && response[i] < ev.options.length
  );
}

/** @returns null = écran non noté */
export function grade(screen: GradableScreen | null | undefined, response: unknown): boolean | null {
  if (!screen || screen.scored !== true) return null;
  const p: AnyRecord = screen.payload && typeof screen.payload === 'object' ? (screen.payload as AnyRecord) : {};
  switch (screen.type) {
    case 'choice':
      return sameSet(response, correctIds(p.options));
    case 'document':
      return sameSet(response, correctIds(p.lines));
    case 'number':
    case 'slider':
      return withinTolerance(response, p);
    case 'dialogue':
      return dialogue(response, p.replies);
    case 'allocate':
      return allocate(response, p);
    case 'live_month':
      return liveMonth(response, p);
    default:
      return null;
  }
}
