import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { useApi } from '@/src/context/ApiContext';
import { emailConfirmationOf } from '@/src/utils/emailConfirmation';

// Retour dans l'app (après le lien du courriel, ouvert dans le navigateur) :
// le profil est relu tant que l'adresse n'est pas confirmée, pour que le
// bandeau et les demandes de confirmation disparaissent aussitôt. Rien à afficher.
export default function EmailConfirmationRefresh() {
  const { user, refreshUser } = useApi();
  const pending = emailConfirmationOf(user, 0).pending;
  const latest = useRef({ pending, refreshUser });

  useEffect(() => {
    latest.current = { pending, refreshUser };
  });

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active' && latest.current.pending) latest.current.refreshUser().catch(() => {});
    });
    return () => sub.remove();
  }, []);

  return null;
}
