import { useEffect } from 'react';

import { useApi } from '@/src/context/ApiContext';
import { loadPatrimoinePrefs, updatePatrimoinePrefs } from '@/src/state/patrimoinePrefs';
import { useSession } from '@/src/state/session';
import { userKeyOf, type UserKey } from '@/src/state/userMemory';
import type { Position } from '@/src/utils/patrimoine/model';
import { importSavingsGoals, readSavingsGoals } from '@/src/utils/patrimoine/savingsImport';

// Comptes dont la reprise est en cours ou faite pendant cette session
const started = new Set<UserKey>();

async function importOnce(user: UserKey, getSavings: () => Promise<unknown>, positions: readonly Position[]) {
  if (started.has(user)) return;
  started.add(user);
  try {
    if ((await loadPatrimoinePrefs(user)).savingsImported) return;
    const goals = readSavingsGoals(await getSavings());
    if (!goals) throw new Error('Réponse illisible');
    await updatePatrimoinePrefs(user, (p) => importSavingsGoals(p, goals, positions, new Date()));
  } catch {
    // réseau ou serveur : nouvel essai à la prochaine ouverture
    started.delete(user);
  }
}

// Objectifs de l'ancien outil Épargne du site repris dans ceux du patrimoine,
// une seule fois par compte, à l'ouverture de Mon patrimoine, une fois les
// placements connus (liens par défaut, objectifs déjà dépassés)
export function useSavingsImport(positions: readonly Position[] | null) {
  const { getSavings } = useApi();
  const session = useSession();
  const userKey = session.profile === 'ready' && session.user?.id != null ? userKeyOf(session.user.id) : null;
  useEffect(() => {
    if (userKey && positions) importOnce(userKey, getSavings, positions);
  }, [userKey, getSavings, positions]);
}
