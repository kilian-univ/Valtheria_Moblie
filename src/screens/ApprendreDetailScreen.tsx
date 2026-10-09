import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import LessonEndFlow from '@/src/components/apprendre/end/LessonEndFlow';
import LessonSkeleton from '@/src/components/apprendre/LessonSkeleton';
import AnswerSheet, { Verdict } from '@/src/components/apprendre/player/AnswerSheet';
import LessonTopBar from '@/src/components/apprendre/player/LessonTopBar';
import QuitSheet from '@/src/components/apprendre/player/QuitSheet';
import ScreenRenderer from '@/src/components/apprendre/ScreenRenderer';
import { AnswerDraft, CollectedAnswer, Screen } from '@/src/components/apprendre/types';
import AppText from '@/src/components/common/AppText';
import Button from '@/src/components/common/Button';
import PageState from '@/src/components/common/PageState';
import { SkeletonGroup } from '@/src/components/common/Skeleton';
import { StaggerItem } from '@/src/components/common/Stagger';
import { devSlowLoading } from '@/src/constants/dev';
import { palette, space } from '@/src/constants/style/Style';
import { useApi } from '@/src/context/ApiContext';
import { useTheme } from '@/src/context/ThemeContext';
import { isNetworkError } from '@/src/hooks/useLearningData';
import { learningStore } from '@/src/state/learningStore';
import { error as errorHaptic, success as successHaptic } from '@/src/utils/haptics';
import {
  buildResponses,
  finishedModuleTitle,
  firstTryRun,
  isFirstTryCorrect,
  isGradable,
  LessonResult,
} from '@/src/utils/lessonPlayer';

type LoadError = 'network' | 'server';

const LOAD_ERROR_MESSAGE: Record<LoadError, string> = {
  network: 'Impossible de charger la leçon : pas de connexion internet.',
  server: 'Impossible de charger la leçon : le serveur ne répond pas.',
};

function submitErrorMessage(err: unknown): string {
  return isNetworkError(err)
    ? 'Impossible d’enregistrer ta leçon : pas de connexion internet. Tes réponses sont gardées.'
    : 'Impossible d’enregistrer ta leçon : le serveur ne répond pas. Tes réponses sont gardées.';
}

export default function ApprendreDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const { getLesson, completeLesson, getModules, getProgress } = useApi();

  const [screens, setScreens] = useState<Screen[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<CollectedAnswer[]>([]);
  const [isLoading, setIsLoading] = useState(Boolean(id));
  const [loadError, setLoadError] = useState<LoadError | null>(null);

  // Écran en cours : réponse en cours, puis validée
  const [draft, setDraft] = useState<AnswerDraft | null>(null);
  const [answered, setAnswered] = useState(false);

  // Feuille de réponse : montée tant que verdict existe, ouverte selon sheetOpen
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<LessonResult | null>(null);
  const [moduleTitle, setModuleTitle] = useState<string | null>(null);

  // Série de jours avant la leçon, pour fêter son augmentation à la fin
  const [streakBefore] = useState<number | null>(() =>
    learningStore.getState().loaded ? learningStore.getState().streak : null
  );

  const [quitMounted, setQuitMounted] = useState(false);
  const [quitOpen, setQuitOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const pendingLeave = useRef<any>(null);

  const scrollRef = useRef<ScrollView>(null);
  const screenY = useRef(0);

  const fetchLesson = useCallback(() => {
    if (!id) return;
    // devSlowLoading : délai de test en développement seulement (constants/dev.ts)
    devSlowLoading()
      .then(() => getLesson(Number(id)))
      .then((data: any) => {
        const resolvedScreens = Array.isArray(data) ? data : (data.screens ?? []);

        // DIAGNOSTIC : résumé de la leçon + JSON complet des types pas encore construits
        console.log(
          `LEÇON ${id} — "${data.title}" — types d'écrans :`,
          resolvedScreens.map((s: any) => s.type).join(', ')
        );

        const HANDLED = ['reveal', 'choice', 'document', 'slider'];
        resolvedScreens
          .filter((s: any) => !HANDLED.includes(s.type))
          .forEach((s: any, i: number) => {
            console.log(`ÉCRAN NON GÉRÉ [${s.type}] #${i}:`, JSON.stringify(s, null, 2));
          });

        setScreens(resolvedScreens);
      })
      .catch((err: any) => {
        console.log('ERREUR LEÇON:', err?.message);
        setLoadError(isNetworkError(err) ? 'network' : 'server');
      })
      .finally(() => setIsLoading(false));
  }, [id, getLesson]);

  useEffect(() => {
    fetchLesson();
  }, [fetchLesson]);

  const retryLoad = () => {
    setLoadError(null);
    setIsLoading(true);
    fetchLesson();
  };

  const current = screens[index];
  const isLast = index === screens.length - 1;
  const gradable = isGradable(current);
  const progress = screens.length > 0 ? (index + 1) / screens.length : 0;
  const run = firstTryRun(answers, screens);

  // ---------------------------------------------------------------------------
  // Quitter : croix, retour Android, balayage iOS → feuille de confirmation
  // ---------------------------------------------------------------------------
  usePreventRemove(screens.length > 0 && !result && !leaving, ({ data }) => {
    pendingLeave.current = data.action;
    setQuitMounted(true);
    setQuitOpen(true);
  });

  const askQuit = () => {
    setQuitMounted(true);
    setQuitOpen(true);
  };

  const confirmQuit = () => {
    setQuitOpen(false);
    setLeaving(true);
  };

  // Une fois la protection levée (rendu suivant), on part pour de bon
  useEffect(() => {
    if (!leaving) return;
    if (pendingLeave.current) navigation.dispatch(pendingLeave.current);
    else router.back();
  }, [leaving, navigation, router]);

  // ---------------------------------------------------------------------------
  // Enchaînement des écrans
  // ---------------------------------------------------------------------------
  const goNext = () => {
    if (index >= screens.length - 1) return;
    setIndex((i) => i + 1);
    setDraft(null);
    setAnswered(false);
  };

  const handleFinish = async () => {
    if (!id || isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Format attendu : { "<index d'écran>": [tentative1, tentative2, ...] }
      const responses = buildResponses(answers, screens);

      const res = await completeLesson(Number(id), { responses });
      console.log('COMPLETE RÉSULTAT:', JSON.stringify(res, null, 2));

      // 1. Instantané : XP et série viennent directement de la réponse de /complete
      if (res?.user) {
        learningStore.setState({ xp: res.user.xp, streak: res.user.streak });
      }

      // 2. En tâche de fond pendant que l'utilisateur lit les écrans de fin :
      //    la leçon terminée et la suivante débloquée seront prêtes au retour.
      Promise.all([getModules(), getProgress()])
        .then(([modulesData, progressData]) => {
          learningStore.setState({
            modules: modulesData,
            streak: progressData?.streak ?? 0,
            xp: progressData?.xp ?? 0,
          });
        })
        .catch(() => {});

      setModuleTitle(finishedModuleTitle(res ?? {}, learningStore.getState().modules, Number(id)));
      setResult(res ?? {});
    } catch (err: any) {
      console.log('ERREUR COMPLETE:', err?.message);
      // Les réponses restent en mémoire : « Réessayer » renvoie les mêmes
      errorHaptic();
      setSubmitError(submitErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleValidate = () => {
    if (!current || !draft || answered) return;
    const answer: CollectedAnswer = {
      screenIndex: index,
      type: current.type,
      notion: current.notion,
      correct: draft.correct,
      raw: draft.raw,
    };
    const nextAnswers = [...answers, answer];
    setAnswers(nextAnswers);
    setAnswered(true);
    setVerdict({
      correct: draft.correct,
      firstTry: isFirstTryCorrect(nextAnswers, screens, index),
      correctText: draft.correctText,
      explanation: current.explanation,
      val: draft.correct ? current.val?.correct : current.val?.wrong,
    });
    setSheetOpen(true);
    if (draft.correct) successHaptic();
    else errorHaptic();
  };

  // « Continuer » de la feuille de réponse
  const continueFromSheet = () => {
    if (isLast) {
      handleFinish();
      return;
    }
    setSheetOpen(false);
    goNext();
  };

  // « Continuer » des écrans non notés
  const handleContinue = () => {
    if (!current) return;
    // Écran non noté : on trace quand même le passage (jamais envoyé, voir buildResponses)
    if (current.type === 'reveal' && !answers.some((a) => a.screenIndex === index)) {
      setAnswers((prev) => [
        ...prev,
        { screenIndex: index, type: 'reveal', correct: true, raw: { type: 'reveal', seen: true } },
      ]);
    }
    if (isLast) handleFinish();
    else goNext();
  };

  const scrollToY = useCallback((y: number) => {
    scrollRef.current?.scrollTo({ y: screenY.current + y, animated: true });
  }, []);

  // ---------------------------------------------------------------------------
  // Rendu
  // ---------------------------------------------------------------------------
  if (result) {
    return (
      <LessonEndFlow
        result={result}
        streakBefore={streakBefore}
        moduleTitle={moduleTitle}
        onDone={() => router.back()}
      />
    );
  }

  const notFound = !isLoading && !loadError && !current;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <LessonTopBar progress={progress} run={run} onClose={() => router.back()} />

      {loadError || notFound ? (
        <View style={styles.state}>
          {loadError ? (
            <PageState
              variant="error"
              title="Leçon indisponible"
              message={LOAD_ERROR_MESSAGE[loadError]}
              onRetry={retryLoad}
            />
          ) : (
            <PageState
              variant="empty"
              mood="preoccupe"
              text="Je ne trouve pas cette leçon."
              actionLabel="Retour"
              onAction={() => router.back()}
            />
          )}
        </View>
      ) : isLoading || !current ? (
        // Chargement : la barre du haut est réelle, le reste en squelette
        <SkeletonGroup>
          <LessonSkeleton />
        </SkeletonGroup>
      ) : (
        <>
          <ScrollView
            ref={scrollRef}
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* key : chaque écran est remonté (état neuf, apparition rejouée) */}
            <View key={index} onLayout={(e) => (screenY.current = e.nativeEvent.layout.y)}>
              <StaggerItem index={0}>
                <ScreenRenderer
                  screen={current}
                  screenIndex={index}
                  answered={answered}
                  onDraftChange={setDraft}
                  scrollToY={scrollToY}
                />
              </StaggerItem>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            {submitError && !verdict ? (
              <AppText variant="callout" tone="error" accessibilityRole="alert" style={styles.footerError}>
                {submitError}
              </AppText>
            ) : null}
            {gradable ? (
              <Button
                label="Valider"
                onPress={handleValidate}
                disabled={!draft || answered}
                disabledReason={!draft ? 'Choisis une réponse pour valider.' : undefined}
                silent
              />
            ) : (
              <Button
                label={submitError ? 'Réessayer' : 'Continuer'}
                onPress={handleContinue}
                loading={isLast && isSubmitting}
              />
            )}
          </View>
        </>
      )}

      {verdict ? (
        <AnswerSheet
          open={sheetOpen}
          verdict={verdict}
          onContinue={continueFromSheet}
          onRequestClose={askQuit}
          onClosed={() => setVerdict(null)}
          loading={isSubmitting}
          errorText={submitError}
        />
      ) : null}

      {quitMounted ? (
        <QuitSheet
          open={quitOpen}
          onStay={() => {
            pendingLeave.current = null;
            setQuitOpen(false);
          }}
          onQuit={confirmQuit}
          onClosed={() => setQuitMounted(false)}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: space[5],
    paddingTop: space[4],
    paddingBottom: space[8],
  },
  state: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: space[5],
  },
  footer: {
    paddingHorizontal: space[5],
    paddingTop: space[3],
    paddingBottom: space[3],
  },
  footerError: {
    textAlign: 'center',
    marginBottom: space[3],
  },
});
