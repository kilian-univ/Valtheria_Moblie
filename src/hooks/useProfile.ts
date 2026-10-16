import { useEffect } from 'react';

import { useApi } from '@/src/context/ApiContext';
import { useDictionary } from '@/src/hooks/useDictionary';
import { useLearningData } from '@/src/hooks/useLearningData';
import { DISCOVERY, OBJECTIVE_OPTIONS, type Objective, toObjective } from '@/src/lesson/discovery';
import { useDiscoveredWords } from '@/src/state/discoveredWords';
import { useNotebook } from '@/src/state/notebook';
import { rememberObjective, setUserObjective, useStoredObjective } from '@/src/state/objective';
import { useOnboarding } from '@/src/state/onboarding';
import { useBestStreak } from '@/src/state/streakRewards';
import { useWeekJournal } from '@/src/state/weekJournal';
import { userKeyOf } from '@/src/state/userMemory';
import { discoveredCount } from '@/src/utils/discoveredWords';
import { success } from '@/src/utils/haptics';
import { levelInfo, nextUniverse, objectiveProgress, serverObjective } from '@/src/utils/profile';
import { weekSummary } from '@/src/utils/weekJournal';

// Données du profil et des réglages : compte, niveau, série, objectif,
// carnet, mots découverts. Les modules et univers sont rechargés à chaque
// affichage (comme l'onglet Apprendre).
export function useProfile() {
  const { user, updateUser } = useApi();
  const learning = useLearningData();
  const dictionary = useDictionary();
  const { state: onboarding } = useOnboarding();
  const userKey = userKeyOf(user?.id);

  // Chiffres : ceux de l'onglet Apprendre s'ils sont chargés (rafraîchis par
  // chaque leçon), sinon ceux du profil
  const loaded = learning.modules.length > 0 || learning.xp > 0;
  const xp = loaded ? learning.xp : (user?.xp ?? 0);
  const streak = loaded ? learning.streak : (user?.streak ?? 0);
  const vals = loaded ? learning.vals : (user?.vals ?? 0);
  const best = useBestStreak(user?.id, streak);
  const level = levelInfo(xp);

  // Objectif : choisi sur ce téléphone, sinon celui du serveur, sinon celui
  // de la première ouverture
  const stored = useStoredObjective(userKey);
  const objective: Objective = stored ?? toObjective(user?.objective) ?? onboarding.objective ?? 'decouvrir';
  const objectiveLabel = OBJECTIVE_OPTIONS.find((o) => o.value === objective)?.label ?? '';
  const objectiveSlug = DISCOVERY[objective].universe.slug;
  const progress = objectiveProgress(objectiveSlug, learning.universes, learning.modules);
  useEffect(() => {
    if (stored !== undefined) rememberObjective(objective);
  }, [stored, objective]);

  // Changer d'objectif : toujours sur le téléphone ; sur le serveur aussi
  // quand il connaît cet objectif. 'serveur' | 'telephone'
  const changeObjective = async (next: Objective): Promise<'serveur' | 'telephone'> => {
    await setUserObjective(userKey, next);
    success();
    const remote = serverObjective(next);
    if (!remote || !user) return 'telephone';
    try {
      await updateUser({ objective: remote } as unknown as Parameters<typeof updateUser>[0]);
      return 'serveur';
    } catch {
      return 'telephone';
    }
  };

  const finished = progress.total > 0 && progress.done >= progress.total;
  const after = finished ? nextUniverse(objectiveSlug, learning.universes, learning.modules) : null;

  const declics = useNotebook(userKey) ?? [];
  const week = weekSummary(useWeekJournal(userKey) ?? [], new Date());
  const words = useDiscoveredWords(userKey) ?? [];
  const terms = dictionary.entries.map((e) => e.term);

  return {
    user,
    userKey,
    xp,
    streak,
    vals,
    best,
    level,
    objective,
    objectiveLabel,
    objectiveSlug,
    progress,
    finished,
    nextUniverse: after,
    week,
    changeObjective,
    universes: learning.universes,
    declics,
    wordsDiscovered: discoveredCount(words, terms),
    wordsTotal: terms.length,
  };
}
