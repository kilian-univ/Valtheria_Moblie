import { useEffect, useSyncExternalStore } from 'react';

import { useApi } from '@/src/context/ApiContext';
import { learningStore } from '@/src/state/learningStore';
import { useLearningLog } from '@/src/state/learningLog';
import { useNotebook } from '@/src/state/notebook';
import { cachedLesson, updateRevisionMemory, useRevisionMemory } from '@/src/state/revisionMemory';
import { userKeyOf } from '@/src/state/userMemory';
import { useWeekJournal } from '@/src/state/weekJournal';
import { localDay } from '@/src/utils/day';
import { universeOfModule } from '@/src/utils/modulePath';
import { buildCandidates, type DailyPlan, pickRevision, seededRandom } from '@/src/utils/revision';

// Leçons terminées relues par l'API à chaque passage, au plus (les autres
// au passage suivant) : la révision ne retarde jamais l'accueil
const FETCH_PER_PASS = 12;
// Leçons déjà demandées pendant cette ouverture de l'app (succès ou échec)
const asked = new Map<string, Set<number>>();
// Relecture des leçons manquantes, par compte : en cours, ou terminée
const status = new Map<string, 'running' | 'idle'>();
const statusListeners = new Set<() => void>();
function setStatus(key: string, value: 'running' | 'idle') {
  if (status.get(key) === value) return;
  status.set(key, value);
  statusListeners.forEach((l) => l());
}
function subscribeStatus(listener: () => void) {
  statusListeners.add(listener);
  return () => {
    statusListeners.delete(listener);
  };
}

function yesterdayOf(day: string): string {
  const [y, m, d] = day.split('-').map(Number);
  return localDay(new Date(y, m - 1, d - 1));
}

// Révision du jour d'un compte : la matière (écrans des leçons terminées,
// relus par l'API s'ils ne sont pas encore sur le téléphone, et déclics du
// carnet), puis la révision tirée une fois par jour et gardée. Retourne aussi
// l'état du programme du jour (leçon faite, révision faite).
export function useDailyRevision(userId: number | null | undefined) {
  const { getLesson } = useApi();
  const key = userKeyOf(userId);
  const memory = useRevisionMemory(key);
  const declics = useNotebook(key);
  const log = useLearningLog(key);
  const journal = useWeekJournal(key);
  const { modules, universes, loaded } = useSyncExternalStore(learningStore.subscribe, learningStore.getState);
  const today = localDay(new Date());

  // 1. Écrans des leçons terminées ailleurs (ou avant cette version) : relus
  const material = useSyncExternalStore(subscribeStatus, () => status.get(key) ?? 'pending');
  const fetching = material !== 'idle';
  useEffect(() => {
    if (userId === null || userId === undefined || !loaded || !memory) return;
    // Une relecture en cours (la mémoire change à chaque leçon gardée) : on l'attend
    if (status.get(key) === 'running') return;
    const tried = asked.get(key) ?? new Set<number>();
    asked.set(key, tried);
    const missing = modules
      .flatMap((m) => (m.lessons ?? []).filter((l) => l.completed).map((l) => ({ lesson: l, module: m })))
      .filter(({ lesson }) => !memory.lessons[String(lesson.id)] && !tried.has(lesson.id))
      .slice(0, FETCH_PER_PASS);
    if (missing.length === 0) {
      setStatus(key, 'idle');
      return;
    }
    missing.forEach(({ lesson }) => tried.add(lesson.id));
    setStatus(key, 'running');
    (async () => {
      for (const { lesson, module } of missing) {
        try {
          const data = await getLesson(lesson.id);
          const slug = universeOfModule(module, universes)?.slug ?? null;
          const entry = cachedLesson(lesson.id, data, slug, new Date().toISOString());
          await updateRevisionMemory(key, (m) => ({ ...m, lessons: { ...m.lessons, [String(lesson.id)]: entry } }));
        } catch {
          // Hors ligne ou leçon indisponible : sans cette leçon
        }
      }
    })().finally(() => setStatus(key, 'idle'));
  }, [userId, key, loaded, memory, modules, universes, getLesson]);

  // 2. Révision du jour : tirée une fois (ou dès qu'il y a de la matière)
  const plan = memory?.plans.find((p) => p.day === today) ?? null;
  useEffect(() => {
    if (userId === null || userId === undefined || fetching || !memory || declics === null || log === null) return;
    const existing = memory.plans.find((p) => p.day === today);
    if (existing && (existing.items.length > 0 || existing.done)) return;
    const random = seededRandom(`${key}|${today}`);
    const doneAt = new Map(log.map((e) => [e.lessonId, e.at]));
    const candidates = buildCandidates({
      lessons: Object.values(memory.lessons),
      declics,
      history: memory.history,
      lessonDoneAt: (id) => doneAt.get(id) ?? null,
      random,
    });
    const yesterday = memory.plans.find((p) => p.day === yesterdayOf(today));
    const lessonsDone = modules.reduce((n, m) => n + (m.lessons ?? []).filter((l) => l.completed).length, 0);
    const picked = pickRevision({
      candidates,
      lessonsDone,
      yesterday: yesterday ? { keys: yesterday.items.map((i) => i.key) } : null,
      random,
    });
    if (existing && picked.length === 0) return;
    const next: DailyPlan = { day: today, items: picked.map((c) => c.item), done: null };
    updateRevisionMemory(key, (m) => ({ ...m, plans: [...m.plans.filter((p) => p.day !== today), next] }));
  }, [userId, key, fetching, memory, declics, log, modules, today]);

  const lessonDone = (log ?? []).some((e) => e.day === today) || (journal ?? []).some((e) => e.day === today);
  return {
    plan,
    // Nombre réel d'écrans de la révision du jour
    count: plan?.items.length ?? 0,
    ready: !!memory && !fetching && plan !== null,
    revisionDone: !!plan?.done,
    lessonDone,
    log: log ?? [],
  };
}
