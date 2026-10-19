import { RESEND_COOLDOWN_S } from '@/src/utils/emailConfirmation';
import { actionErrorText, isNetworkError } from '@/src/utils/loadError';

// Délai entre deux renvois du courriel de confirmation, partagé par le
// bandeau et les pages qui demandent la confirmation (gardé en mémoire)
let until = 0;
const listeners = new Set<() => void>();

export function subscribeCooldown(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function cooldownUntil() {
  return until;
}

function startCooldown() {
  until = Date.now() + RESEND_COOLDOWN_S * 1000;
  listeners.forEach((l) => l());
}

type Post = (path: string, body?: unknown) => Promise<any>;

export type ResendResult = { ok: boolean; message: string; alreadyConfirmed: boolean };

// POST /user/email/resend : un nouveau lien, valable 24 h
export async function resendConfirmation(post: Post): Promise<ResendResult> {
  try {
    const data = await post('/user/email/resend');
    startCooldown();
    const message = typeof data?.message === 'string' ? data.message : 'Courriel envoyé.';
    return { ok: true, message, alreadyConfirmed: data?.sent === false };
  } catch (err) {
    // Refus du serveur (trop tôt) : on attend aussi ; coupure réseau : on peut retenter
    if (!isNetworkError(err)) startCooldown();
    return {
      ok: false,
      message: actionErrorText(err, 'Le courriel n’est pas parti. Réessaie dans un instant.', 'Pas de connexion internet. Réessaie dans un instant.'),
      alreadyConfirmed: false,
    };
  }
}
