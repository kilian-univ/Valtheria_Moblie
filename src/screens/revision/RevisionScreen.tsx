import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import EndFlowBoundary from '@/src/components/apprendre/end/EndFlowBoundary';
import LessonEndFlow from '@/src/components/apprendre/end/LessonEndFlow';
import AppText from '@/src/components/common/AppText';
import Button from '@/src/components/common/Button';
import GoldConfetti from '@/src/components/common/GoldConfetti';
import PageState from '@/src/components/common/PageState';
import ValBubble from '@/src/components/common/ValBubble';
import { fonts, palette, space, titleLetterSpacing } from '@/src/constants/style/Style';
import { useApi } from '@/src/context/ApiContext';
import { useTheme } from '@/src/context/ThemeContext';
import { isNetworkError } from '@/src/hooks/useLearningData';
import { normalizeLesson } from '@/src/lesson/normalize';
import ApprendreDetailScreen from '@/src/screens/ApprendreDetailScreen';
import { markDayCelebrated } from '@/src/state/dayCelebration';
import { learningLogStore } from '@/src/state/learningLog';
import { learningStore } from '@/src/state/learningStore';
import { useNotebook } from '@/src/state/notebook';
import { type RevisionMemory, updateRevisionMemory, useRevisionMemory } from '@/src/state/revisionMemory';
import { fetchServerRevision } from '@/src/state/serverRevision';
import { type UserKey, userKeyOf } from '@/src/state/userMemory';
import { weekJournalStore } from '@/src/state/weekJournal';
import { localDay } from '@/src/utils/day';
import { allModulesDone } from '@/src/utils/learning';
import { feedback } from '@/src/utils/feedback';
import { error as errorHaptic, success } from '@/src/utils/haptics';
import type { LessonResult, LessonSummary } from '@/src/utils/lessonPlayer';
import {
  type DailyPlan,
  recordResults,
  revisionLesson,
  revisionVerdict,
  type ServerRevision,
  serverResponses,
  serverRevisionLesson,
  serverRevisionUsable,
  termOfKey,
} from '@/src/utils/revision';
import { revisionWords } from '@/src/utils/revisionWords';
import { dayNumber } from '@/src/utils/dictionary';
import { useDictionary } from '@/src/hooks/useDictionary';
import { recordWordResult, useWordStates } from '@/src/state/wordStates';

const VAL_DIAMETER = 72;
const SCORE_SIZE = 44;
const FIRST_REVISION = 'Ta première révision arrive après ta première leçon.';

type Recap = { correct: number; total: number; dayDone: boolean };

// Fin d'une révision du serveur jouée : tout ce qu'il faut pour l'envoyer
type Played = {
  record: ServerRevision;
  summary: LessonSummary;
  responses: Record<string, unknown[]>;
  serverCount: number;
  extras: { correct: number; total: number };
};

// Envois à /complete en cours ou faits, par session et par essai : un écran
// remonté (ou un effet rejoué) ne renvoie jamais deux fois la même révision
// (le serveur répondrait « session déjà terminée »)
const sends = new Map<string, Promise<Record<string, any>>>();

// Mots du Dictionnaire révisés : réussi → maîtrisé ; raté → « Vu », il
// revient dès le lendemain
function recordWords(user: UserKey, results: readonly { key: string; correct: boolean }[]) {
  for (const r of results) {
    const term = termOfKey(r.key);
    if (term) recordWordResult(user, term, r.correct).catch(() => {});
  }
}

const leave = () => (router.canGoBack() ? router.back() : router.replace('/apprendre'));

// La journée est-elle faite avec cette révision ? Oui si la leçon du jour
// est faite (journal du téléphone), ou s'il n'y a plus de leçon disponible
// (la révision seule compte alors)
async function lessonDoneToday(user: UserKey): Promise<boolean> {
  if (allModulesDone(learningStore.getState().modules)) return true;
  const today = localDay(new Date());
  const [log, journal] = await Promise.all([learningLogStore.load(user), weekJournalStore.load(user)]);
  return log.some((e) => e.day === today) || journal.some((e) => e.day === today);
}

// Révision du jour, jouée dans le lecteur des leçons (pastille « RÉVISION »,
// retours, sons et vibrations habituels, sans rattrapage).
// - En priorité, la révision du serveur gardée pour la journée (redemandée si
//   sa session a expiré), plus quelques déclics du carnet : sa fin est envoyée
//   à /complete, puis la fin de leçon habituelle montre les XP et la série.
// - Sinon, la révision construite par l'app : un petit bilan « n sur total »
//   avec Val, sans XP.
// Chaque déclic et chaque écran révisé par l'app est noté (date, résultat)
// pour l'espacement des prochaines révisions.
export default function RevisionScreen() {
  const { user, get } = useApi();
  const key = userKeyOf(user?.id);
  const memory = useRevisionMemory(key);
  const [today] = useState(() => localDay(new Date()));
  const declics = useNotebook(key);
  // Mots dus (session du serveur expirée, redemandée avec ses ajouts)
  const dictionary = useDictionary();
  const wordMemory = useWordStates(key);
  const words = useMemo(
    () => (wordMemory && dictionary.entries.length > 0 ? revisionWords(wordMemory, dictionary.entries, today, dayNumber(new Date())) : null),
    [wordMemory, dictionary.entries, today]
  );
  const [recap, setRecap] = useState<Recap | null>(null);
  const [played, setPlayed] = useState<Played | null>(null);
  const [ended, setEnded] = useState<{ result: LessonResult; summary: LessonSummary; streakBefore: number | null } | null>(null);
  // Session du serveur expirée : on en redemande une ; échec : la révision de l'app
  const [refreshFailed, setRefreshFailed] = useState(false);
  const refreshing = useRef(false);

  const record = memory?.servers.find((r) => r.day === today) ?? null;
  const expired = !!record && !serverRevisionUsable(record, today, new Date());
  useEffect(() => {
    if (!memory || declics === null || !expired || refreshFailed || refreshing.current) return;
    refreshing.current = true;
    fetchServerRevision(get, key, memory, declics, words ?? []).then(
      () => {
        refreshing.current = false;
      },
      () => {
        refreshing.current = false;
        setRefreshFailed(true);
      }
    );
  }, [memory, declics, words, expired, refreshFailed, get, key]);

  if (memory === null) return null;

  if (ended) {
    return (
      <EndFlowBoundary onDone={leave} revision>
        <LessonEndFlow
          revision
          result={ended.result}
          summary={ended.summary}
          lessonTitle="Révision du jour"
          takeaway={null}
          streakBefore={ended.streakBefore}
          moduleTitle={null}
          onDone={leave}
        />
      </EndFlowBoundary>
    );
  }
  if (played) {
    return (
      <ServerSubmit
        user={key}
        played={played}
        onCounted={setEnded}
        onLocal={(r) => {
          setPlayed(null);
          setRecap(r);
        }}
      />
    );
  }
  if (recap) return <RevisionRecap recap={recap} />;

  // Révision du serveur
  if (record && !expired) {
    if (record.done) {
      return <RevisionRecap recap={{ correct: record.done.correct, total: record.done.total, dayDone: false }} />;
    }
    const count = (record.session?.screens.length ?? 0) + record.extras.length;
    if (count === 0) return <EmptyState text={record.empty?.hasNotions ? 'Rien à réviser aujourd’hui.' : FIRST_REVISION} />;
    return <ServerRevisionPlayer user={key} record={record} onPlayed={setPlayed} onLocal={setRecap} />;
  }
  if (record && expired && !refreshFailed) return <Waiting text="Préparation de ta révision…" />;

  // Révision de l'app
  const plan = memory.plans.find((p) => p.day === today) ?? null;
  if (plan?.done) {
    return <RevisionRecap recap={{ correct: plan.done.correct, total: plan.done.total, dayDone: false }} />;
  }
  if (!plan || plan.items.length === 0) {
    // Session du serveur expirée et impossible d'en avoir une autre
    if (record && refreshFailed) {
      return <EmptyState text="Impossible de préparer ta révision pour l’instant. Réessaie dans un moment." />;
    }
    return <EmptyState text={FIRST_REVISION} />;
  }
  return <RevisionPlayer user={key} plan={plan} memory={memory} onFinished={setRecap} />;
}

function EmptyState({ text }: { text: string }) {
  return (
    <View style={styles.state}>
      <PageState variant="empty" mood="complice" text={text} actionLabel="Retour" onAction={leave} />
    </View>
  );
}

function Waiting({ text }: { text: string }) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  return (
    <View style={[styles.state, styles.waiting]} accessible accessibilityLabel={text} accessibilityLiveRegion="polite">
      <ActivityIndicator color={colors.gold} />
      <AppText variant="callout" tone="subtitle">
        {text}
      </AppText>
    </View>
  );
}

// Révision du serveur (et ses déclics) dans le lecteur
function ServerRevisionPlayer({
  user,
  record,
  onPlayed,
  onLocal,
}: {
  user: UserKey;
  record: ServerRevision;
  onPlayed: (played: Played) => void;
  onLocal: (recap: Recap) => void;
}) {
  const [built] = useState(() => serverRevisionLesson(record));
  const [lesson] = useState(() => normalizeLesson({ title: built.title, screens: built.screens }));

  const finished = useCallback(
    async (summary: LessonSummary, results: { index: number; correct: boolean }[], responses: Record<string, unknown[]>) => {
      const at = new Date().toISOString();
      // Déclics : notés sur le téléphone, comme dans la révision de l'app
      const extras = results
        .filter((r) => r.index >= built.serverCount)
        .map((r) => ({ key: built.extraKeys[r.index - built.serverCount], correct: r.correct }))
        .filter((r): r is { key: string; correct: boolean } => typeof r.key === 'string');
      recordWords(user, extras);
      await updateRevisionMemory(user, (m) => ({ ...m, history: recordResults(m.history, extras, at) }));
      const extraScore = { correct: extras.filter((r) => r.correct).length, total: extras.length };

      if (record.session) {
        onPlayed({ record, summary, responses, serverCount: built.serverCount, extras: extraScore });
        return;
      }
      // Déclics seuls (rien à réviser côté serveur) : bilan sur le téléphone
      await updateRevisionMemory(user, (m) => ({
        ...m,
        servers: m.servers.map((r) =>
          r.day === record.day
            ? { ...r, done: { at, correct: summary.correct, total: summary.total, xp: null, streak: null, counted: false } }
            : r
        ),
      }));
      const dayDone = await lessonDoneToday(user);
      if (dayDone) markDayCelebrated(user, localDay(new Date()));
      onLocal({ correct: summary.correct, total: summary.total, dayDone });
    },
    [user, record, built, onPlayed, onLocal]
  );

  const mode = useMemo(
    () => ({ lesson, onFinished: finished, badge: 'RÉVISION', retry: false, exitTo: '/apprendre' as const }),
    [lesson, finished]
  );
  return <ApprendreDetailScreen discovery={mode} />;
}

// Envoi de la révision au serveur (/complete), puis la fin de leçon
// habituelle (bilan, XP, série). Échec : réessayer, ou terminer sans
// l'enregistrer (bilan du téléphone, sans XP).
function ServerSubmit({
  user,
  played,
  onCounted,
  onLocal,
}: {
  user: UserKey;
  played: Played;
  onCounted: (end: { result: LessonResult; summary: LessonSummary; streakBefore: number | null }) => void;
  onLocal: (recap: Recap) => void;
}) {
  const { post, getProgress } = useApi();
  const insets = useSafeAreaInsets();
  const [attempt, setAttempt] = useState(0);
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const session = played.record.session;
    if (!session) return;
    const streakBefore = learningStore.getState().loaded ? learningStore.getState().streak : null;
    const sendKey = `${session.id}#${attempt}`;
    let send = sends.get(sendKey);
    if (!send) {
      send = post(`/revision/${session.id}/complete`, {
        responses: serverResponses(played.responses, played.serverCount),
      }) as Promise<Record<string, any>>;
      sends.set(sendKey, send);
      send.catch(() => sends.delete(sendKey));
    }
    send.then(
      async (res: Record<string, any>) => {
        const at = new Date().toISOString();
        const correct = (Number(res?.first_try_correct) || 0) + played.extras.correct;
        const total = (Number(res?.scored_total) || played.serverCount) + played.extras.total;
        const xp = typeof res?.xp_earned === 'number' ? res.xp_earned : null;
        const streak = typeof res?.new_streak === 'number' ? res.new_streak : null;
        await updateRevisionMemory(user, (m) => ({
          ...m,
          servers: m.servers.map((r) =>
            r.day === played.record.day ? { ...r, done: { at, correct, total, xp, streak, counted: true } } : r
          ),
        }));
        // Série et XP : la série tout de suite, le reste relu en tâche de fond
        if (streak !== null) learningStore.setState({ streak });
        getProgress()
          .then((p: Record<string, any>) => {
            if (p) learningStore.setState({ xp: p.xp ?? learningStore.getState().xp, streak: p.streak ?? streak ?? 0, vals: p.vals ?? learningStore.getState().vals });
          })
          .catch(() => {});
        if (!active) return;
        onCounted({
          result: {
            xp_gained: xp ?? 0,
            daily_streak_bonus: typeof res?.daily_streak_bonus === 'number' ? res.daily_streak_bonus : 0,
            first_try_correct: correct,
            scored_total: total,
            user: streak !== null ? { streak } : undefined,
          },
          summary: { correct, total, recovered: 0 },
          streakBefore,
        });
      },
      (err: unknown) => {
        if (!active) return;
        errorHaptic();
        setFailure(
          isNetworkError(err)
            ? 'Impossible d’enregistrer ta révision : pas de connexion internet.'
            : 'Impossible d’enregistrer ta révision : le serveur ne répond pas, ou la session a expiré.'
        );
      }
    );
    return () => {
      active = false;
    };
    // attempt : « Réessayer » relance l'envoi
  }, [attempt, played, post, getProgress, user, onCounted]);

  const finishLocally = async () => {
    const at = new Date().toISOString();
    const { correct, total } = played.summary;
    await updateRevisionMemory(user, (m) => ({
      ...m,
      servers: m.servers.map((r) =>
        r.day === played.record.day ? { ...r, done: { at, correct, total, xp: null, streak: null, counted: false } } : r
      ),
    }));
    const dayDone = await lessonDoneToday(user);
    if (dayDone) markDayCelebrated(user, localDay(new Date()));
    onLocal({ correct, total, dayDone });
  };

  if (!failure) return <Waiting text="Enregistrement de ta révision…" />;
  return (
    <View style={[styles.recap, { paddingTop: insets.top + space[4], paddingBottom: insets.bottom + space[3] }]}>
      <View style={styles.center}>
        <PageState
          variant="error"
          title="Révision non enregistrée"
          message={failure}
          onRetry={() => {
            setFailure(null);
            setAttempt((n) => n + 1);
          }}
        />
      </View>
      <Button variant="text" label="Terminer sans l’enregistrer" onPress={finishLocally} />
    </View>
  );
}

// Révision construite par l'app
function RevisionPlayer({
  user,
  plan,
  memory,
  onFinished,
}: {
  user: UserKey;
  plan: DailyPlan;
  memory: RevisionMemory;
  onFinished: (recap: Recap) => void;
}) {
  // Construite une seule fois : la mémoire peut changer pendant la partie
  const [built] = useState(() => revisionLesson(plan.items, Object.values(memory.lessons)));
  const [lesson] = useState(() => normalizeLesson({ title: built.title, screens: built.screens }));

  const finished = useCallback(
    async (summary: LessonSummary, results: { index: number; correct: boolean }[]) => {
      const at = new Date().toISOString();
      const scored = results
        .map((r) => ({ key: built.keys[r.index], correct: r.correct }))
        .filter((r): r is { key: string; correct: boolean } => typeof r.key === 'string');
      recordWords(user, scored);
      await updateRevisionMemory(user, (m) => ({
        ...m,
        history: recordResults(m.history, scored, at),
        plans: m.plans.map((p) => (p.day === plan.day ? { ...p, done: { at, correct: summary.correct, total: summary.total } } : p)),
      }));
      // La leçon du jour est-elle faite aussi ? Alors la journée est faite
      const dayDone = await lessonDoneToday(user);
      if (dayDone) markDayCelebrated(user, localDay(new Date()));
      onFinished({ correct: summary.correct, total: summary.total, dayDone });
    },
    [user, plan.day, built.keys, onFinished]
  );

  const mode = useMemo(
    () => ({ lesson, onFinished: finished, badge: 'RÉVISION', retry: false, exitTo: '/apprendre' as const }),
    [lesson, finished]
  );
  return <ApprendreDetailScreen discovery={mode} />;
}

function RevisionRecap({ recap }: { recap: Recap }) {
  const insets = useSafeAreaInsets();
  const val = revisionVerdict(recap.correct, recap.total, recap.dayDone);
  // Journée faite : la grande célébration (vibration et son de fin) ; sinon
  // une vibration de réussite
  const dayDone = recap.dayDone;
  useEffect(() => {
    if (dayDone) feedback.lessonComplete();
    else success();
  }, [dayDone]);
  return (
    <View style={[styles.recap, { paddingTop: insets.top + space[4], paddingBottom: insets.bottom + space[3] }]}>
      {recap.dayDone ? <GoldConfetti /> : null}
      <View style={styles.center}>
        <AppText variant="sectionLabel" style={styles.kicker}>
          Révision du jour
        </AppText>
        <AppText
          maxFontSizeMultiplier={1.2}
          style={styles.score}
          accessibilityRole="header"
          accessibilityLabel={`${recap.correct} bonnes réponses sur ${recap.total}`}
        >
          {`${recap.correct} sur ${recap.total}`}
        </AppText>
        <ValBubble mood={val.mood} diameter={VAL_DIAMETER} text={val.line} />
      </View>
      <Button label="Terminer" onPress={leave} />
    </View>
  );
}

const styles = StyleSheet.create({
  state: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: space[5],
  },
  waiting: {
    alignItems: 'center',
    gap: space[3],
  },
  recap: {
    flex: 1,
    paddingHorizontal: space[5],
    justifyContent: 'space-between',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    gap: space[6],
    alignItems: 'stretch',
  },
  kicker: {
    textAlign: 'center',
    marginBottom: -space[4],
  },
  score: {
    fontFamily: fonts.title,
    fontSize: SCORE_SIZE,
    lineHeight: SCORE_SIZE + 8,
    letterSpacing: titleLetterSpacing(SCORE_SIZE),
    textAlign: 'center',
  },
});
