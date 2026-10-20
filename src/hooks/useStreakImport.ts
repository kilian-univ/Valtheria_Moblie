import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect } from 'react';

import { useApi } from '@/src/context/ApiContext';
import { learningLogStore } from '@/src/state/learningLog';
import { learningStore } from '@/src/state/learningStore';
import { onboardingStore } from '@/src/state/onboarding';
import { useSession } from '@/src/state/session';
import { streakRewardsStore } from '@/src/state/streakRewards';
import { userKeyOf, type UserKey } from '@/src/state/userMemory';
import { simulateStreak } from '@/src/utils/streakRewards';
import { streakFieldsOf, streakReprisePayload } from '@/src/utils/streakServer';

// Comptes dont la reprise est en cours ou faite pendant cette session
const started = new Set<UserKey>();
// Reprise faite pour ce compte (clé par compte : effacée avec lui)
const doneKey = (userId: number) => `valtheria:serie-reprise:${userId}`;

type Post = (path: string, body?: unknown) => Promise<unknown>;

async function importOnce(userId: number, post: Post) {
  const key = userKeyOf(userId);
  if (started.has(key)) return;
  started.add(key);
  try {
    if (await AsyncStorage.getItem(doneKey(userId))) return;
    // Record du compte (gardé sur le téléphone) et parcours sans compte ; les
    // jours de leçon du téléphone donnent la série, ses gels et son record
    const [record, onboarding, log] = await Promise.all([streakRewardsStore.load(userId), onboardingStore.load(), learningLogStore.load(key)]);
    const history = simulateStreak([...onboarding.lessonDays, ...log.map((e) => e.day)]);
    const data = await post('/user/streak/reprise', streakReprisePayload(Math.max(record.best, onboarding.bestStreak), history));
    await AsyncStorage.setItem(doneKey(userId), new Date().toISOString()).catch(() => {});
    learningStore.setState(streakFieldsOf(data));
  } catch {
    // réseau, serveur sans la route : nouvel essai à la prochaine ouverture
    started.delete(key);
  }
}

// Première connexion d'un compte sur ce téléphone : les gels et le record de
// série gardés localement rejoignent le compte, une seule fois (le serveur ne
// descend jamais sous ses propres valeurs)
export function useStreakImport() {
  const { post } = useApi();
  const session = useSession();
  const userId = session.profile === 'ready' && session.user?.id != null ? session.user.id : null;
  useEffect(() => {
    if (userId != null) importOnce(userId, post);
  }, [userId, post]);
}
