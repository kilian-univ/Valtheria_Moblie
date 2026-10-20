import { useEffect, useState, useSyncExternalStore } from 'react';

import { useApi } from '@/src/context/ApiContext';
import { cooldownUntil, resendConfirmation, subscribeCooldown } from '@/src/state/emailConfirmation';
import { cooldownLeft, emailConfirmationOf, RESEND_COOLDOWN_S } from '@/src/utils/emailConfirmation';

// État de la confirmation de l'adresse, renvoi du courriel (une fois par
// minute, compte à rebours) et vérification après un passage par le courriel
export function useEmailConfirmation() {
  const { user, post, refreshUser } = useApi();
  const [now, setNow] = useState(() => Date.now());
  const until = useSyncExternalStore(subscribeCooldown, cooldownUntil);
  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  // Compte à rebours, seulement pendant l'attente
  useEffect(() => {
    if (until <= Date.now()) return;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= until) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [until]);

  const state = emailConfirmationOf(user, now);
  // Délai tout juste lancé : jamais plus d'une minute affichée
  const left = cooldownLeft(until, Math.max(now, until - RESEND_COOLDOWN_S * 1000));

  async function resend() {
    if (sending || left > 0) return;
    setSending(true);
    const r = await resendConfirmation(post);
    setSending(false);
    setNote(r.message);
    if (r.alreadyConfirmed) refreshUser().catch(() => {});
  }

  // « J'ai confirmé » : le profil relu dit si c'est fait
  async function recheck() {
    if (checking) return;
    setChecking(true);
    try {
      const fresh = await refreshUser();
      if (emailConfirmationOf(fresh, Date.now()).pending) {
        setNote('Pas encore confirmée : touche le lien du courriel, puis reviens ici.');
      }
    } catch {
      setNote('Impossible de vérifier pour le moment. Réessaie dans un instant.');
    }
    // (après le try/catch, pas dans un « finally » : le compilateur React
    // sauterait le hook)
    setChecking(false);
  }

  return { ...state, left, sending, checking, note, resend, recheck };
}
