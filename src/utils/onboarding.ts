// Première ouverture : étapes du parcours, reprise, règles du mot de passe.
// Fonctions pures, sans React : testables avec Node.

import { toObjective, type Objective } from '../lesson/discovery';

// Bienvenue → objectif → leçon découverte → fin → inscription (pseudo,
// compte, rappel) → accueil d'Apprendre
export const ONBOARDING_STEPS = ['bienvenue', 'objectif', 'lecon', 'fin', 'pseudo', 'compte', 'rappel'] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

// en-cours : parcours à reprendre ; termine : compte créé ou connecté (jamais
// revu) ; plus-tard : « Plus tard » sur la fin de leçon (accueil sans compte)
export type OnboardingStatus = 'en-cours' | 'termine' | 'plus-tard';

export type OnboardingState = {
  status: OnboardingStatus;
  step: OnboardingStep;
  objective: Objective | null;
  pseudo: string;
};

export const INITIAL_ONBOARDING: OnboardingState = { status: 'en-cours', step: 'bienvenue', objective: null, pseudo: '' };

// État relu du téléphone ; illisible ou incomplet → départ du parcours
export function parseOnboarding(raw: unknown): OnboardingState {
  if (!raw || typeof raw !== 'object') return INITIAL_ONBOARDING;
  const r = raw as Record<string, unknown>;
  const status: OnboardingStatus = r.status === 'termine' || r.status === 'plus-tard' ? r.status : 'en-cours';
  const step = (ONBOARDING_STEPS as readonly unknown[]).includes(r.step) ? (r.step as OnboardingStep) : 'bienvenue';
  // Ancien objectif (première version) : traduit vers le plus proche
  const objective = toObjective(r.objective);
  // Sans objectif, ni leçon ni fin : on repart du choix de l'objectif
  const safeStep = !objective && (step === 'lecon' || step === 'fin') ? 'objectif' : step;
  return { status, step: safeStep, objective, pseudo: typeof r.pseudo === 'string' ? r.pseudo : '' };
}

export type OnboardingRoute = '/bienvenue' | '/bienvenue/objectif' | '/bienvenue/lecon' | '/bienvenue/fin' | '/bienvenue/inscription';

// Écran où reprendre le parcours
export function routeForStep(step: OnboardingStep): OnboardingRoute {
  switch (step) {
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

// Montrer le parcours ? Jamais à une personne connectée ; une fois terminé
// ou remis à plus tard, plus jamais
export function shouldShowOnboarding(state: OnboardingState, isAuthenticated: boolean): boolean {
  return !isAuthenticated && state.status === 'en-cours';
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
