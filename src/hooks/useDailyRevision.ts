import { useEffect, useMemo, useSyncExternalStore } from 'react';

import { useApi } from '@/src/context/ApiContext';
import { learningStore } from '@/src/state/learningStore';
import { useLearningLog } from '@/src/state/learningLog';
import { useDictionary } from '@/src/hooks/useDictionary';
import { useNotebook } from '@/src/state/notebook';
import { saveLessonText } from '@/src/state/lessonTexts';
import { useWordStates } from '@/src/state/wordStates';
import { dayNumber } from '@/src/utils/dictionary';
import { revisionWords } from '@/src/utils/revisionWords';
import { cachedLesson, updateRevisionMemory, useRevisionMemory } from '@/src/state/revisionMemory';
import { fetchServerRevision } from '@/src/state/serverRevision';
import { userKeyOf } from '@/src/state/userMemory';
import { useWeekJournal } from '@/src/state/weekJournal';
import { localDay } from '@/src/utils/day';
import { universeOfModule } from '@/src/utils/modulePath';
import {
  buildCandidates,
  type DailyPlan,
  nothingDueLabel,
  pickRevision,
  seededRandom,
  serverRevisionUsable,
} from '@/src/utils/revision';

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

// Révision du serveur, par compte : demande en cours, obtenue, ou
// indisponible (hors ligne, route absente, erreur) depuis tel instant
type ServerState = { state: 'loading' | 'ok' | 'unavailable'; at: number };
const server = new Map<string, ServerState>();
const serverListeners = new Set<() => void>();
function setServer(key: string, value: ServerState) {
  server.set(key, value);
  serverListeners.forEach((l) => l());
}
function subscribeServer(listener: () => void) {
  serverListeners.add(listener);
  return () => {
    serverListeners.delete(listener);
  };
}
// Indisponible : on redemande au plus toutes les 5 minutes
const SERVER_RETRY_MS = 5 * 60 * 1000;

export const FIRST_REVISION_TEXT = 'Ta première révision arrive après ta première leçon.';

function yesterdayOf(day: string): string {
  const [y, m, d] = day.split('-').map(Number);
  return localDay(new Date(y, m - 1, d - 1));
}

// Révision du jour d'un compte connecté. En priorité celle du serveur
// (GET /api/revision : ses écrans, XP et série à la fin), gardée pour la
// journée, avec les déclics du carnet en plus. Le serveur indisponible : la
// révision de l'app, sans XP : la matière (écrans des leçons terminées, relus
// par l'API s'ils ne sont pas encore sur le téléphone, et déclics du
// carnet), puis la révision tirée une fois par jour et gardée. Retourne aussi
// l'état du programme du jour (leçon faite, révision faite).
export function useDailyRevision(userId: number | null | undefined) {
  const { getLesson, get } = useApi();
  const key = userKeyOf(userId);
  const memory = useRevisionMemory(key);
  const declics = useNotebook(key);
  // Mots du Dictionnaire dus aujourd'hui, avec leur question (null : pas
  // encore prêts ; dictionnaire indisponible : aucun)
  const dictionary = useDictionary();
  const wordMemory = useWordStates(key);
  const words = useMemo(() => {
    if (dictionary.isLoading || wordMemory === null) return null;
    if (dictionary.entries.length === 0) return [];
    const now = new Date();
    return revisionWords(wordMemory, dictionary.entries, localDay(now), dayNumber(now));
  }, [dictionary.isLoading, dictionary.entries, wordMemory]);
  const log = useLearningLog(key);
  const journal = useWeekJournal(key);
  const { modules, universes, loaded } = useSyncExternalStore(learningStore.subscribe, learningStore.getState);
  const today = localDay(new Date());

  // 0. Révision du serveur : celle gardée pour aujourd'hui, sinon demandée
  const serverState = useSyncExternalStore(subscribeServer, () => server.get(key) ?? null);
  const record = memory?.servers.find((r) => r.day === today) ?? null;
  const usable = serverRevisionUsable(record, today, new Date());
  useEffect(() => {
    if (userId === null || userId === undefined || !memory || declics === null || words === null) return;
    if (usable) {
      if (server.get(key)?.state !== 'ok') setServer(key, { state: 'ok', at: Date.now() });
      return;
    }
    const known = server.get(key);
    if (known?.state === 'loading') return;
    if (known?.state === 'unavailable' && Date.now() - known.at < SERVER_RETRY_MS) return;
    setServer(key, { state: 'loading', at: Date.now() });
    fetchServerRevision(get, key, memory, declics, words).then(
      () => setServer(key, { state: 'ok', at: Date.now() }),
      () => setServer(key, { state: 'unavailable', at: Date.now() })
    );
  }, [userId, key, memory, declics, words, usable, get]);
  // Révision de l'app : seulement si le serveur ne répond pas
  const appMode = serverState?.state === 'unavailable' && !usable;

  // 1. Écrans des leçons terminées ailleurs (ou avant cette version) : relus
  const material = useSyncExternalStore(subscribeStatus, () => status.get(key) ?? 'pending');
  const fetching = material !== 'idle';
  useEffect(() => {
    if (userId === null || userId === undefined || !loaded || !memory || !appMode) return;
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
          // Son texte sert aussi à relier les mots du Dictionnaire aux leçons
          saveLessonText(lesson.id, data, lesson.title);
          const slug = universeOfModule(module, universes)?.slug ?? null;
          const entry = cachedLesson(lesson.id, data, slug, new Date().toISOString());
          await updateRevisionMemory(key, (m) => ({ ...m, lessons: { ...m.lessons, [String(lesson.id)]: entry } }));
        } catch {
          // Hors ligne ou leçon indisponible : sans cette leçon
        }
      }
    })().finally(() => setStatus(key, 'idle'));
  }, [userId, key, loaded, memory, modules, universes, getLesson, appMode]);

  // 2. Révision du jour : tirée une fois (ou dès qu'il y a de la matière)
  const plan = memory?.plans.find((p) => p.day === today) ?? null;
  useEffect(() => {
    if (userId === null || userId === undefined || !appMode || fetching || !memory || declics === null || log === null || words === null) return;
    const existing = memory.plans.find((p) => p.day === today);
    if (existing && (existing.items.length > 0 || existing.done)) return;
    const random = seededRandom(`${key}|${today}`);
    const doneAt = new Map(log.map((e) => [e.lessonId, e.at]));
    const candidates = buildCandidates({
      lessons: Object.values(memory.lessons),
      declics,
      words,
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
  }, [userId, key, appMode, fetching, memory, declics, words, log, modules, today]);

  const lessonDone = (log ?? []).some((e) => e.day === today) || (journal ?? []).some((e) => e.day === today);
  const common = { lessonDone, log: log ?? [] };

  if (usable && record) {
    const count = (record.session?.screens.length ?? 0) + record.extras.length;
    // Rien à réviser aujourd'hui alors qu'il y a déjà des notions : la
    // révision du jour est faite d'office
    const nothingDue = count === 0 && !record.done && !!record.empty?.hasNotions;
    return {
      ...common,
      source: 'server' as const,
      count,
      revisionDone: !!record.done || nothingDue,
      doneText: nothingDue ? nothingDueLabel(record.empty?.nextLabel ?? null) : 'Révision du jour faite',
      emptyText: count === 0 ? FIRST_REVISION_TEXT : null,
    };
  }
  if (appMode) {
    const count = plan?.items.length ?? 0;
    return {
      ...common,
      source: 'app' as const,
      // null : en préparation
      count: !!memory && !fetching && plan !== null ? count : null,
      revisionDone: !!plan?.done,
      doneText: 'Révision du jour faite',
      emptyText: count === 0 ? FIRST_REVISION_TEXT : null,
    };
  }
  // Demande au serveur en cours
  return { ...common, source: 'server' as const, count: null, revisionDone: false, doneText: 'Révision du jour faite', emptyText: null };
}
