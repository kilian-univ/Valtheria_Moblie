import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { useApi } from '@/src/context/ApiContext';
import { recoverProfile } from '@/src/state/session';

// Relance périodique tant que le profil manque
const RETRY_MS = 30_000;

// Reprise du profil (voir src/state/session.ts) : rien à afficher
export default function SessionRecovery() {
  const { token, user, isLoading, refreshUser } = useApi();
  const missing = !isLoading && !!token && !user;
  const latest = useRef({ missing, refreshUser });

  useEffect(() => {
    latest.current = { missing, refreshUser };
  });

  useEffect(() => {
    if (!missing) return;
    recoverProfile(refreshUser);
    const id = setInterval(() => recoverProfile(refreshUser), RETRY_MS);
    return () => clearInterval(id);
  }, [missing, refreshUser]);

  // Retour au premier plan : le réseau est peut-être revenu
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active' && latest.current.missing) recoverProfile(latest.current.refreshUser);
    });
    return () => sub.remove();
  }, []);

  return null;
}
