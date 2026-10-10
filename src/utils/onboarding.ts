// Première ouverture : étapes du parcours, reprise, règles du mot de passe.
// Fonctions pures, sans React : testables avec Node.

import { toObjective, type Objective } from '../lesson/discovery';
import { type AuthFailure, readableMessage } from './authErrors';
import { localDay } from './day';
import { cleanMedalDays } from './streakRewards';

// Bienvenue → prénom → objectif → leçon découverte → fin → inscription
// (pseudo, compte, rappel) → accueil d'Apprendre
export const ONBOARDING_STEPS = ['bienvenue', 'prenom', 'objectif', 'lecon', 'fin', 'pseudo', 'compte', 'rappel'] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

// en-cours : parcours à reprendre ; termine : compte créé ou connecté (jamais
// revu) ; plus-tard : « Plus tard » sur la fin de leçon (accueil sans compte)
export type OnboardingStatus = 'en-cours' | 'termine' | 'plus-tard';

export type OnboardingState = {
  status: OnboardingStatus;
  step: OnboardingStep;
  objective: Objective | null;
  // Prénom donné à Val (vide : passé). Reste sur le téléphone.
  firstName: string;
  pseudo: string;
  // Leçons découvertes commencées, et terminées au moins une fois
  started: Objective[];
  played: Objective[];
  // Jours (AAAA-MM-JJ, heure du téléphone) où une leçon découverte a été
  // terminée : la série de l'accueil sans compte
  lessonDays: string[];
  // Célébration des six leçons découvertes déjà montrée (une seule fois)
  sixCelebrated: boolean;
  // Meilleure série atteinte (médailles gardées si la série casse)
  bestStreak: number;
  // Paliers de série déjà fêtés (3, 7, 14…)
  celebratedMedals: number[];
  // Dernière réponse « inscription_fermee » du serveur (horodatage), sinon null
  signupClosedAt: number | null;
};

export const INITIAL_ONBOARDING: OnboardingState = {
  status: 'en-cours',
  step: 'bienvenue',
  objective: null,
  firstName: '',
  pseudo: '',
  started: [],
  played: [],
  lessonDays: [],
  sixCelebrated: false,
  bestStreak: 0,
  celebratedMedals: [],
  signupClosedAt: null,
};

// Leçons jouées avant l'arrivée de la série (version du 10 octobre 2026,
// 18 h 27) : terminées, mais sans date. Sans correction, l'accueil affichait
// « 0 jour » à quelqu'un qui venait d'en finir plusieurs. Elles comptent pour
// le jour de la première relecture (mémorisé aussitôt, voir state/onboarding).
export function needsLessonDayMigration(raw: unknown): boolean {
  if (!raw || typeof raw !== 'object') return false;
  const r = raw as Record<string, unknown>;
  return !Array.isArray(r.lessonDays) && objectiveList(r.played).length > 0;
}

// État relu du téléphone ; illisible ou incomplet → départ du parcours
export function parseOnboarding(raw: unknown, now: Date = new Date()): OnboardingState {
  if (!raw || typeof raw !== 'object') return INITIAL_ONBOARDING;
  const r = raw as Record<string, unknown>;
  const status: OnboardingStatus = r.status === 'termine' || r.status === 'plus-tard' ? r.status : 'en-cours';
  const step = (ONBOARDING_STEPS as readonly unknown[]).includes(r.step) ? (r.step as OnboardingStep) : 'bienvenue';
  // Ancien objectif (première version) : traduit vers le plus proche
  const objective = toObjective(r.objective);
  // Sans objectif, ni leçon ni fin : on repart du choix de l'objectif
  const safeStep = !objective && (step === 'lecon' || step === 'fin') ? 'objectif' : step;
  const closedAt = typeof r.signupClosedAt === 'number' && Number.isFinite(r.signupClosedAt) ? r.signupClosedAt : null;
  return {
    status,
    step: safeStep,
    objective,
    firstName: typeof r.firstName === 'string' ? cleanFirstName(r.firstName) : '',
    pseudo: typeof r.pseudo === 'string' ? r.pseudo : '',
    started: objectiveList(r.started),
    played: objectiveList(r.played),
    lessonDays: Array.isArray(r.lessonDays)
      ? [...new Set(r.lessonDays.filter((d): d is string => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)))].sort()
      : needsLessonDayMigration(raw)
        ? [localDay(now)]
        : [],
    sixCelebrated: r.sixCelebrated === true,
    bestStreak: typeof r.bestStreak === 'number' && Number.isInteger(r.bestStreak) && r.bestStreak > 0 ? r.bestStreak : 0,
    celebratedMedals: cleanMedalDays(r.celebratedMedals),
    signupClosedAt: closedAt,
  };
}

// Leçons relues : objectifs connus (anciens traduits), sans doublon
function objectiveList(raw: unknown): Objective[] {
  return Array.isArray(raw) ? [...new Set(raw.map(toObjective).filter((o): o is Objective => o !== null))] : [];
}

// Leçon découverte commencée ou terminée : ajoutée à la liste (une seule fois)
export function withPlayed(played: Objective[], objective: Objective): Objective[] {
  return played.includes(objective) ? played : [...played, objective];
}

// L'inscription est tenue pour fermée tant que la dernière réponse
// « inscription_fermee » date de moins de 3 jours : passé ce délai, l'app
// propose de nouveau de créer un compte (une nouvelle tentative remet la
// mémoire à jour, dans un sens ou dans l'autre)
export const SIGNUP_CLOSED_MEMORY_MS = 3 * 24 * 60 * 60 * 1000;

export function isSignupClosed(closedAt: number | null, now: number = Date.now()): boolean {
  return closedAt !== null && now - closedAt >= 0 && now - closedAt < SIGNUP_CLOSED_MEMORY_MS;
}

export type OnboardingRoute = '/bienvenue' | '/bienvenue/prenom' | '/bienvenue/objectif' | '/bienvenue/lecon' | '/bienvenue/fin' | '/bienvenue/inscription';

// Écran où reprendre le parcours
export function routeForStep(step: OnboardingStep): OnboardingRoute {
  switch (step) {
    case 'prenom':
      return '/bienvenue/prenom';
    case 'objectif':
      return '/bienvenue/objectif';
    case 'lecon':
      return '/bienvenue/lecon';
    case 'fin':
      return '/bienvenue/fin';
    case 'pseudo':
    case 'compte':
    case 'rappel':
      return '/bienvenue/inscription';
    default:
      return '/bienvenue';
  }
}

// Étape suivante du parcours (la dernière reste la dernière)
export function stepAfter(step: OnboardingStep): OnboardingStep {
  const i = ONBOARDING_STEPS.indexOf(step);
  return ONBOARDING_STEPS[Math.min(i + 1, ONBOARDING_STEPS.length - 1)];
}

// Montrer le parcours ? Jamais à une personne connectée ; une fois terminé
// ou remis à plus tard, plus jamais
export function shouldShowOnboarding(state: OnboardingState, isAuthenticated: boolean): boolean {
  return !isAuthenticated && state.status === 'en-cours';
}

// ---------------------------------------------------------------------------
// Prénom
// ---------------------------------------------------------------------------

export const FIRST_NAME_MAX = 30;

// Prénom saisi : espaces de début et de fin retirés, espaces répétés réduits
// à un seul, 30 caractères au plus
export function cleanFirstName(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim().slice(0, FIRST_NAME_MAX).trim();
}

// Pseudo proposé à l'inscription à partir du prénom, aux règles du serveur :
// accents retirés, espaces changés en tirets, autres signes écartés, 20
// caractères au plus. Trop court pour le serveur : proposé quand même (la
// personne le complète).
export function pseudoFromFirstName(firstName: string): string {
  return cleanFirstName(firstName)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s']+/g, '-')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 20);
}

// ---------------------------------------------------------------------------
// Inscription
// ---------------------------------------------------------------------------

// Règles réellement exigées par POST /api/auth/register (AuthController :
// pseudo 3 à 20 caractères [a-zA-Z0-9-_], mot de passe 8 caractères au moins)
export const PSEUDO_RULE = /^[a-zA-Z0-9_-]{3,20}$/;

export function pseudoError(pseudo: string): string | null {
  const p = pseudo.trim();
  if (p.length < 3) return 'Au moins 3 caractères.';
  if (p.length > 20) return 'Au plus 20 caractères.';
  if (!PSEUDO_RULE.test(p)) return 'Lettres, chiffres, - et _ seulement (sans espace ni accent).';
  return null;
}

export type PasswordRule = { id: string; label: string; test: (password: string) => boolean };

export const PASSWORD_RULES: readonly PasswordRule[] = [
  { id: 'length', label: 'Au moins 8 caractères', test: (p) => p.length >= 8 },
];

export function passwordValid(password: string): boolean {
  return PASSWORD_RULES.every((r) => r.test(password));
}

export function emailValid(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

// Erreur du serveur → message affiché ; l'adresse déjà prise propose la
// connexion
export function signupError(message: string | undefined): { text: string; emailTaken: boolean } {
  const m = (message ?? '').trim();
  const emailTaken = /adresse a déjà un compte|email has already been taken/i.test(m);
  if (emailTaken) return { text: 'Cette adresse a déjà un compte.', emailTaken };
  if (/pseudo.*(déjà pris|already been taken)/i.test(m)) return { text: 'Ce pseudo est déjà pris. Reviens en arrière pour en choisir un autre.', emailTaken };
  if (/network|internet|timed? ?out/i.test(m)) return { text: 'Pas de connexion internet. Réessaie dans un instant.', emailTaken };
  // Message du serveur déjà en français et lisible : on le garde
  if (m && !/^(Échec de l'inscription|Erreur API|Données invalides\.?)$/i.test(m)) return { text: m, emailTaken };
  return { text: 'L’inscription n’a pas abouti. Vérifie tes informations et réessaie.', emailTaken };
}

// Échec d'inscription lu en entier (code et message, voir authErrors.ts) :
// le message du serveur s'il est lisible, à la racine ou dans error.message,
// sinon celui d'ApiContext (fallbackMessage), sinon le message générique
export function signupErrorFrom(
  failure: AuthFailure | null,
  fallbackMessage?: string
): { text: string; emailTaken: boolean } {
  const raw = failure?.message ?? fallbackMessage;
  const result = signupError(raw);
  // Adresse déjà prise (même en anglais) et pseudo pris : reconnus d'abord
  if (result.emailTaken || result.text !== (raw ?? '').trim()) return result;
  return readableMessage(raw) ? result : signupError(undefined);
}

// ---------------------------------------------------------------------------
// Leçon découverte créditée après l'inscription
// ---------------------------------------------------------------------------

export type DiscoveryCredit = 'avec-objectif' | 'sans-objectif' | 'echec';

// L'objectif n'est gardé que si le serveur l'accepte : refusé (objectif
// inconnu de lui, route absente…), la leçon est créditée sans objectif. Ne
// lève jamais : l'inscription réussit quoi qu'il arrive.
export async function sendDiscoveryCredit(
  post: (path: string, body: Record<string, unknown>) => Promise<unknown>,
  objective: Objective | null
): Promise<DiscoveryCredit> {
  const path = '/onboarding/discovery-complete';
  if (objective) {
    try {
      await post(path, { objective });
      return 'avec-objectif';
    } catch {
      // objectif refusé : on retente sans
    }
  }
  try {
    await post(path, {});
    return 'sans-objectif';
  } catch {
    return 'echec';
  }
}
