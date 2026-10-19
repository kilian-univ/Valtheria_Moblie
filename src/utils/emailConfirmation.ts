// Confirmation de l'adresse e-mail après l'inscription (19/10/2026). Le profil
// du serveur dit si l'adresse est confirmée et jusqu'à quand l'app reste
// entière sans confirmation (7 jours) ; un serveur plus ancien n'envoie rien :
// alors rien à demander.

export type EmailConfirmation = {
  // Adresse pas encore confirmée : le bandeau reste affiché
  pending: boolean;
  // Délai passé : patrimoine, budget et export demandent la confirmation
  required: boolean;
  email: string | null;
};

// Renvoi du courriel : une fois par minute (le serveur l'impose aussi)
export const RESEND_COOLDOWN_S = 60;

export function emailConfirmationOf(user: unknown, nowMs: number): EmailConfirmation {
  if (!user || typeof user !== 'object') return { pending: false, required: false, email: null };
  const u = user as Record<string, unknown>;
  const email = typeof u.email === 'string' ? u.email : null;
  if (u.email_verified !== false) return { pending: false, required: false, email };
  const before = typeof u.email_confirm_before === 'string' ? Date.parse(u.email_confirm_before) : NaN;
  // Le serveur fait foi ; l'échéance couvre l'app restée ouverte au-delà
  const required = u.email_confirmation_required === true || (Number.isFinite(before) && nowMs >= before);
  return { pending: true, required, email };
}

// Secondes avant le prochain renvoi possible
export function cooldownLeft(untilMs: number, nowMs: number): number {
  return Math.max(0, Math.ceil((untilMs - nowMs) / 1000));
}

export function resendLabel(left: number): string {
  return left > 0 ? `Renvoyer dans ${left} s` : 'Renvoyer le courriel';
}
