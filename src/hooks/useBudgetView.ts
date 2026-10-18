import { useCallback } from 'react';

import { useApi } from '@/src/context/ApiContext';
import { loadBudget, useBudget } from '@/src/state/budgetData';
import { useSession } from '@/src/state/session';
import { userKeyOf } from '@/src/state/userMemory';
import type { LoadError } from '@/src/utils/loadError';

export type BudgetView = 'loading' | 'guest' | 'error' | 'ready';

// Ce que montre un écran du budget (Mon budget, Cash-flow, bilan), comme pour
// le patrimoine : squelette, sans compte, erreur avec « Réessayer », ou les
// données (éventuellement anciennes si le dernier rechargement a échoué).
export function useBudgetView() {
  const { get } = useApi();
  const session = useSession();
  const userKey = session.user?.id != null ? userKeyOf(session.user.id) : null;
  const data = useBudget(userKey, get);
  const { retryProfile } = session;

  let view: BudgetView;
  let errorKind: LoadError = 'server';
  if (session.profile === 'pending' || session.profile === 'loading') view = 'loading';
  else if (session.profile === 'guest') view = 'guest';
  else if (session.profile === 'error') {
    view = 'error';
    errorKind = session.errorKind;
  } else if (data.budget) view = 'ready';
  else if (data.status === 'error') {
    view = 'error';
    errorKind = data.errorKind ?? 'server';
  } else view = 'loading';

  const retry = useCallback(() => {
    if (!userKey) retryProfile();
    else loadBudget(userKey, get, true);
  }, [userKey, get, retryProfile]);

  return { userKey, data, view, errorKind, stale: view === 'ready' && data.errorKind !== null, retry };
}
