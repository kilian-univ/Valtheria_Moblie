import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AppText from '@/src/components/common/AppText';
import Button from '@/src/components/common/Button';
import GoldConfetti from '@/src/components/common/GoldConfetti';
import PageState from '@/src/components/common/PageState';
import ValBubble from '@/src/components/common/ValBubble';
import { fonts, space, titleLetterSpacing } from '@/src/constants/style/Style';
import { useApi } from '@/src/context/ApiContext';
import { normalizeLesson } from '@/src/lesson/normalize';
import ApprendreDetailScreen from '@/src/screens/ApprendreDetailScreen';
import { markDayCelebrated } from '@/src/state/dayCelebration';
import { learningLogStore } from '@/src/state/learningLog';
import { type RevisionMemory, updateRevisionMemory, useRevisionMemory } from '@/src/state/revisionMemory';
import { type UserKey, userKeyOf } from '@/src/state/userMemory';
import { weekJournalStore } from '@/src/state/weekJournal';
import { localDay } from '@/src/utils/day';
import { feedback } from '@/src/utils/feedback';
import { success } from '@/src/utils/haptics';
import type { LessonSummary } from '@/src/utils/lessonPlayer';
import { type DailyPlan, recordResults, revisionLesson, revisionVerdict } from '@/src/utils/revision';

const VAL_DIAMETER = 72;
const SCORE_SIZE = 44;

type Recap = { correct: number; total: number; dayDone: boolean };

const leave = () => (router.canGoBack() ? router.back() : router.replace('/apprendre'));

// Révision du jour : jouée dans le lecteur des leçons (pastille « RÉVISION »,
// retours, sons et vibrations habituels, sans rattrapage), puis un petit
// bilan « <n> sur <total> » avec Val. Chaque écran révisé est noté (date,
// résultat) pour l'espacement des prochaines révisions. Pas d'XP ni de série
// pour l'instant (docs/lot-serveur.md).
export default function RevisionScreen() {
  const { user } = useApi();
  const key = userKeyOf(user?.id);
  const memory = useRevisionMemory(key);
  const [today] = useState(() => localDay(new Date()));
  const [recap, setRecap] = useState<Recap | null>(null);

  if (memory === null) return null;
  const plan = memory.plans.find((p) => p.day === today) ?? null;

  if (recap) return <RevisionRecap recap={recap} />;
  if (plan?.done) {
    return <RevisionRecap recap={{ correct: plan.done.correct, total: plan.done.total, dayDone: false }} />;
  }
  if (!plan || plan.items.length === 0) {
    return (
      <View style={styles.state}>
        <PageState
          variant="empty"
          mood="complice"
          text="Ta première révision arrive après ta première leçon."
          actionLabel="Retour"
          onAction={leave}
        />
      </View>
    );
  }
  return <RevisionPlayer user={key} plan={plan} memory={memory} onFinished={setRecap} />;
}

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
      await updateRevisionMemory(user, (m) => ({
        ...m,
        history: recordResults(m.history, scored, at),
        plans: m.plans.map((p) => (p.day === plan.day ? { ...p, done: { at, correct: summary.correct, total: summary.total } } : p)),
      }));
      // La leçon du jour est-elle faite aussi ? Alors la journée est faite
      const today = localDay(new Date());
      const [log, journal] = await Promise.all([learningLogStore.load(user), weekJournalStore.load(user)]);
      const dayDone = log.some((e) => e.day === today) || journal.some((e) => e.day === today);
      if (dayDone) markDayCelebrated(user, today);
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
