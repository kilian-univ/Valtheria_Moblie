import { useCallback } from 'react';

import { useApi } from '@/src/context/ApiContext';
import { loadPatrimoine, usePatrimoine } from '@/src/state/patrimoineData';
import { useSession } from '@/src/state/session';
import { userKeyOf } from '@/src/state/userMemory';
import type { LoadError } from '@/src/utils/loadError';

export type PatrimoineView = 'loading' | 'guest' | 'error' | 'ready';

// Ce que montre un écran du patrimoine (Mon patrimoine, Un actif, Analyse) :
// - loading : squelette (jeton, profil ou portefeuille en route) ;
// - guest : sans compte ;
// - error : rien à montrer, avec la cause (réseau ou serveur) et « Réessayer » ;
// - ready : les données, éventuellement anciennes (stale) si le dernier
//   rechargement a échoué : on les garde, avec un bandeau.
// Le profil manquant (hors ligne au démarrage) compte comme une erreur, pas
// comme un chargement sans fin.
export function usePatrimoineView() {
  const { getPortfolio } = useApi();
  const session = useSession();
  const userKey = session.user?.id != null ? userKeyOf(session.user.id) : null;
  const data = usePatrimoine(userKey, getPortfolio);
  const { retryProfile } = session;

  let view: PatrimoineView;
  let errorKind: LoadError = 'server';
  // Nouvelle tentative en cours depuis l'erreur : l'erreur reste affichée
  let retrying = false;
  if (session.profile === 'pending' || session.profile === 'loading') view = 'loading';
  else if (session.profile === 'guest') view = 'guest';
  else if (session.profile === 'error') {
    view = 'error';
    errorKind = session.errorKind;
    retrying = session.profileRetrying;
  } else if (data.portfolio && data.ledger) view = 'ready';
  // Réponse à un format que l'app ne sait pas lire : erreur du serveur
  else if (data.portfolio && !data.ledger) view = 'error';
  else if (data.status === 'error') {
    view = 'error';
    errorKind = data.errorKind ?? 'server';
    retrying = data.retrying;
  } else view = 'loading';

  const retry = useCallback(() => {
    if (!userKey) retryProfile();
    else loadPatrimoine(userKey, getPortfolio, true);
  }, [userKey, getPortfolio, retryProfile]);

  return {
    userKey,
    data,
    view,
    errorKind,
    retrying,
    // Données affichées, mais le dernier rechargement a échoué
    stale: view === 'ready' && data.error !== null,
    staleKind: data.errorKind ?? 'server',
    retry,
  };
}
