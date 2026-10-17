/* =========================================================================
   Verdict d'un écran — PORTAGE À L'IDENTIQUE de resources/js/reader/grade.js
   du site (lui-même miroir de app/Services/Lesson/ScreenGrader.php), depuis
   le lot serveur n° 9 (17/10/2026) qui corrige tous les types de l'app.
   SEULE source de correction de l'app : chaque écran noté calcule son
   verdict ici. Le serveur recalcule tout à la fin de la leçon et fait foi.
   Cas partagés : tests/fixtures/reader-grading.json, copie de celui du site
   (tests/grade.test.ts).
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
  const rules: AnyRecord[] = Array.isArray(p.rules) ? p.rules : [];
  if (total === null || buckets.length === 0 || rules.length === 0 || !response || typeof response !== 'object' || Array.isArray(response))
    return false;
  const given = response as AnyRecord;
  const values: Record<string, number> = {};
  let sum = 0;
  for (const b of buckets) {
    const key = String(b?.key ?? '');
    const v = parseNumber(given[key] ?? null);
    if (v === null || v < 0) return false;
    values[key] = v;
    sum += v;
  }
  if (Math.abs(sum - total) > 1e-6) return false;
  return rules.every((r) => {
    const min = parseNumber(r?.min ?? null);
    return min !== null && (values[String(r.bucket ?? '')] ?? 0) >= min - 1e-9;
  });
}

// Id envoyé par le lecteur : texte ou entier (comme is_string || is_int côté serveur)
const isId = (x: unknown): boolean => typeof x === 'string' || Number.isInteger(x);

// Ids d'une liste de l'app (cartes, éléments, paires) : l'id donné, sinon la position
function idsOf(list: unknown): string[] {
  return (Array.isArray(list) ? list : []).map((it: AnyRecord, i: number) =>
    it?.id === undefined || it?.id === null || String(it.id) === '' ? String(i) : String(it.id)
  );
}

function trueFalse(response: unknown, p: AnyRecord): boolean {
  const cards: AnyRecord[] = Array.isArray(p.cards) ? p.cards : [];
  if (cards.length === 0 || !response || typeof response !== 'object') return false;
  const given = response as AnyRecord;
  const ids = idsOf(cards);
  let right = 0;
  for (let i = 0; i < cards.length; i++) {
    const answer = given[ids[i]];
    if (typeof answer !== 'boolean') return false;
    if (cards[i]?.answer === answer) right++;
  }
  const pass = Number.isInteger(p.pass) && p.pass >= 1 && p.pass <= cards.length ? p.pass : cards.length;
  return right >= pass;
}

function order(response: unknown, p: AnyRecord): boolean {
  const ids = idsOf(p.items);
  if (ids.length === 0 || !Array.isArray(response) || response.length !== ids.length) return false;
  return ids.every((id, i) => isId(response[i]) && String(response[i]) === id);
}

function match(response: unknown, p: AnyRecord): boolean {
  const ids = idsOf(p.pairs).sort();
  const given = response as AnyRecord;
  if (ids.length === 0 || !given || typeof given !== 'object' || !Array.isArray(given.found) || !Number.isInteger(given.errors))
    return false;
  const found = [...new Set(given.found.map((x: unknown) => (isId(x) ? String(x) : '')))].sort();
  const max = Number.isInteger(p.max_errors) && p.max_errors >= 0 ? p.max_errors : 0;
  return found.length === ids.length && found.every((f, i) => f === ids[i]) && given.errors >= 0 && given.errors <= max;
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
    case 'true_false':
      return trueFalse(response, p);
    case 'order':
      return order(response, p);
    case 'match':
      return match(response, p);
    case 'live_month':
      return liveMonth(response, p);
    default:
      return null;
  }
}
