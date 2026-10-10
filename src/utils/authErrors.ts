// Erreurs d'inscription et de connexion renvoyées par le serveur. Fonctions
// pures, sans React : testables avec Node.
//
// Deux formes possibles, à lire toutes les deux :
//   { "error": { "code": "inscription_fermee", "message": "…" } }
//   { "code": "inscription_fermee", "message": "…" }  (bientôt, à la racine)

// L'inscription depuis l'app est fermée (décision volontaire, réponse 403)
export const REGISTRATION_CLOSED = 'inscription_fermee';

export type AuthFailure = { status: number | null; code: string | null; message: string | null };

type AnyRecord = Record<string, unknown>;

function isRecord(v: unknown): v is AnyRecord {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function text(v: unknown): string | null {
  return typeof v === 'string' && v.trim() !== '' ? v.trim() : null;
}

// Réponse en échec → code et message, à la racine d'abord, sinon dans error
// (et dans data, si le serveur enveloppe sa réponse)
export function parseAuthFailure(status: number | null, json: unknown): AuthFailure {
  const root = isRecord(json) ? json : {};
  const nested = [root.error, isRecord(root.data) ? root.data.error : undefined, root.data].filter(isRecord);
  const pick = (key: string) => text(root[key]) ?? nested.map((n) => text(n[key])).find((v) => v !== null) ?? null;
  return { status, code: pick('code'), message: pick('message') };
}

// Inscription fermée : le code, à la racine ou dans error ; ou un 403 sans
// autre code (même décision, renvoyée par une version du serveur sans code)
export function isRegistrationClosed(failure: AuthFailure | null): boolean {
  if (!failure) return false;
  if (failure.code === REGISTRATION_CLOSED) return true;
  return failure.status === 403 && failure.code === null;
}

// Messages techniques ou génériques (ceux d'ApiContext compris) : jamais
// montrés tels quels
const NOT_READABLE = [
  /^(Erreur API|Échec de l'inscription|Identifiants incorrects|Données invalides)\.?$/i,
  /^(Server Error|Unauthenticated|Unauthorized|Forbidden|Not Found|Too Many Attempts)\.?$/i,
  /exception|sqlstate|\bstack\b|\bundefined\b|\bnull\b|\bthe\b|\bthese\b|\bfailed\b/i,
];

// Message du serveur lisible par la personne, sinon null
export function readableMessage(message: string | null | undefined): string | null {
  const m = text(message);
  if (!m || m.length > 200) return null;
  return NOT_READABLE.some((re) => re.test(m)) ? null : m;
}

// Échec du réseau (fetch lève un TypeError « Network request failed »)
export function isNetworkMessage(message: string | null | undefined): boolean {
  return /network|internet|timed? ?out|offline/i.test(message ?? '');
}

// Message affiché pour un échec de connexion : celui du serveur s'il est
// lisible, sinon le message générique
export function loginErrorText(failure: AuthFailure | null, fallbackMessage?: string): string {
  if (isNetworkMessage(fallbackMessage)) return 'Pas de connexion internet. Réessaie dans un instant.';
  return readableMessage(failure?.message) ?? 'E-mail ou mot de passe incorrect.';
}
