import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, Platform, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { SlideInRight, SlideOutLeft } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import EndFlowBoundary from '@/src/components/apprendre/end/EndFlowBoundary';
import LessonEndFlow from '@/src/components/apprendre/end/LessonEndFlow';
import LessonSkeleton from '@/src/components/apprendre/LessonSkeleton';
import AnswerSheet, { Verdict } from '@/src/components/apprendre/player/AnswerSheet';
import Cascade from '@/src/components/apprendre/player/Cascade';
import LessonTopBar from '@/src/components/apprendre/player/LessonTopBar';
import QuitSheet from '@/src/components/apprendre/player/QuitSheet';
import ValSays from '@/src/components/apprendre/player/ValSays';
import ScreenRenderer from '@/src/components/apprendre/ScreenRenderer';
import { AnswerDraft, CollectedAnswer } from '@/src/components/apprendre/types';
import AppText from '@/src/components/common/AppText';
import Pill from '@/src/components/common/Pill';
import Button from '@/src/components/common/Button';
import PageState from '@/src/components/common/PageState';
import { SkeletonGroup } from '@/src/components/common/Skeleton';
import { devSlowLoading } from '@/src/constants/dev';
import { easeOut, motion } from '@/src/constants/motion';
import { palette, space } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { useApi } from '@/src/context/ApiContext';
import { isNetworkError } from '@/src/hooks/useLearningData';
import { PARI_INTRO } from '@/src/lesson/discovery/shared';
import type { LessonModel, LessonScreen, ValLine } from '@/src/lesson/model';
import { normalizeLesson } from '@/src/lesson/normalize';
import { learningStore } from '@/src/state/learningStore';
import { error as errorHaptic, success as successHaptic } from '@/src/utils/haptics';
import {
  buildResponses,
  canContinue,
  defaultValLine,
  estimateFor,
  finishedModuleTitle,
  firstTryRun,
  isFirstTryCorrect,
  isGradable,
  LessonResult,
  primaryLabel,
  validateHint,
} from '@/src/utils/lessonPlayer';

type LoadError = 'network' | 'server';

// Hauteur de la feuille de réponse repliée, moins le bouton du bas qu'elle
// recouvre (place laissée sous le contenu)
const COLLAPSED_SHEET_ROOM = 160;
const COLLAPSE_SCROLL_DELAY = motion.sheet;

// Passage d'un écran au suivant : l'ancien glisse à gauche, le nouveau
// arrive de la droite (300 ms, ease-out). Animations réduites : direct.
// (Le web ne connaît pas cette courbe : il garde la sienne, proche.)
const SLIDE_IN =
  Platform.OS === 'web' ? SlideInRight.duration(motion.screen) : SlideInRight.duration(motion.screen).easing(easeOut);
const SLIDE_OUT =
  Platform.OS === 'web' ? SlideOutLeft.duration(motion.screen) : SlideOutLeft.duration(motion.screen).easing(easeOut);
// Cascade de l'écran (Val, sa bulle, le contenu) : dès l'arrivée sur le
// premier écran, à mi-glissement ensuite
const CASCADE_AFTER_SLIDE = motion.screen / 2;
const RANK_VAL = 0;
const RANK_BUBBLE = 1;
const RANK_CONTENT = 2;
// Après « Valider » : le temps de montrer les options corrigées
// (pulsation, tremblement), puis la feuille monte avec la vibration
const SHEET_AFTER_VERDICT = motion.shake;

const LOAD_ERROR_MESSAGE: Record<LoadError, string> = {
  network: 'Impossible de charger la leçon : pas de connexion internet.',
  server: 'Impossible de charger la leçon : le serveur ne répond pas.',
};

function submitErrorMessage(err: unknown): string {
  return isNetworkError(err)
    ? 'Impossible d’enregistrer ta leçon : pas de connexion internet. Tes réponses sont gardées.'
    : 'Impossible d’enregistrer ta leçon : le serveur ne répond pas. Tes réponses sont gardées.';
}

// Type tel que le serveur le nomme (« number », « choice »…)
function typeOf(screen: LessonScreen): string {
  return screen.kind === 'unsupported' ? screen.type : screen.kind;
}

// Réplique de Val à l'arrivée sur un écran. Pari d'une leçon découverte :
// la réplique courte commune ; écran sans réplique : celle de son type.
function introLine(screen: LessonScreen, discovery: boolean, isLast: boolean): ValLine {
  if (discovery && screen.kind === 'slider' && !screen.scored) return PARI_INTRO;
  return screen.val.intro ?? defaultValLine(screen, isLast);
}

// Leçon découverte de la première ouverture : leçon fournie (pas de
// chargement), corrigée sur le téléphone, rien n'est envoyé au serveur ; à la
// fin, onFinished prend la main (écran de fin du parcours).
export type DiscoveryMode = {
  lesson: LessonModel;
  onFinished: () => void;
};

export default function ApprendreDetailScreen({ discovery }: { discovery?: DiscoveryMode } = {}) {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const { getLesson, completeLesson, getModules, getProgress } = useApi();

  const [screens, setScreens] = useState<LessonScreen[]>(() => discovery?.lesson.screens ?? []);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<CollectedAnswer[]>([]);
  const [isLoading, setIsLoading] = useState(!discovery && Boolean(id));
  // Leçon découverte terminée : la protection de sortie est levée, puis onFinished
  const [discoveryDone, setDiscoveryDone] = useState(false);
  const [loadError, setLoadError] = useState<LoadError | null>(null);

  // Écran en cours : réponse en cours, puis validée
  const [draft, setDraft] = useState<AnswerDraft | null>(null);
  const [answered, setAnswered] = useState(false);

  // Feuille de réponse : montée tant que verdict existe, ouverte selon sheetOpen
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const sheetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (sheetTimer.current) clearTimeout(sheetTimer.current);
  }, []);

  // Réplique de Val qui remplace celle de l'arrivée (réaction, tranche du
  // simulateur…) ; null : celle de l'arrivée
  const [valOverride, setValOverride] = useState<ValLine | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  // Dernier « Continuer » donné : la barre de progression est pleine
  const [finishing, setFinishing] = useState(false);
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
    if (!id || discovery) return;
    // devSlowLoading : délai de test en développement seulement (constants/dev.ts)
    devSlowLoading()
      .then(() => getLesson(Number(id)))
      .then((data: unknown) => {
        // Forme du serveur → format interne : tout se passe dans lesson/normalize.ts
        const lesson = normalizeLesson(data);

        // DIAGNOSTIC : résumé de la leçon + JSON complet des types pas encore construits
        console.log(
          `LEÇON ${id} — "${lesson.title}" — types d'écrans :`,
          lesson.screens.map((s) => (s.kind === 'unsupported' ? s.type : s.kind)).join(', ')
        );
        lesson.screens
          .filter((s) => s.kind === 'unsupported')
          .forEach((s) => {
            console.log(`ÉCRAN NON GÉRÉ #${s.index}:`, JSON.stringify(s.source, null, 2));
          });

        setScreens(lesson.screens);
      })
      .catch((err: any) => {
        console.log('ERREUR LEÇON:', err?.message);
        setLoadError(isNetworkError(err) ? 'network' : 'server');
      })
      .finally(() => setIsLoading(false));
  }, [id, getLesson, discovery]);

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
  // Part de 0 et avance d'une case par écran terminé (après « Continuer »)
  const progress = screens.length > 0 ? (finishing ? screens.length : index) / screens.length : 0;
  const estimate = estimateFor(screens, answers, index);
  const run = firstTryRun(answers, screens);

  // Val en haut de l'écran : sa réaction, sinon sa réplique d'arrivée
  const valLine = current ? (valOverride ?? introLine(current, !!discovery, isLast)) : null;
  // Cascade de l'écran, et moment où son contenu a fini d'arriver
  const cascadeAt = index > 0 ? CASCADE_AFTER_SLIDE : 0;
  const enterDelay = cascadeAt + RANK_CONTENT * motion.stagger + motion.sheet;

  // ---------------------------------------------------------------------------
  // Quitter : croix et retour Android → feuille de confirmation. Le balayage
  // iOS est coupé (gestureEnabled: false, app/_layout.tsx et
  // app/apprendre/_layout.tsx).
  // ---------------------------------------------------------------------------
  const guarded = screens.length > 0 && !result && !leaving && !discoveryDone;

  // Filet de sécurité : toute autre sortie (lien, navigation programmée)
  usePreventRemove(guarded, ({ data }) => {
    pendingLeave.current = data.action;
    setQuitMounted(true);
    setQuitOpen(true);
  });

  const askQuit = useCallback(() => {
    setQuitMounted(true);
    setQuitOpen(true);
  }, []);

  // Sortie : écran précédent ; sans lui (parcours repris directement sur la
  // leçon découverte), le choix de l'objectif ou l'accueil
  const leave = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace(discovery ? '/bienvenue/objectif' : '/apprendre');
  }, [router, discovery]);

  const handleClose = () => {
    if (guarded) askQuit();
    else leave();
  };

  // Retour Android : la feuille s'ouvre avant toute navigation (aucune page
  // ne s'affiche derrière). Les feuilles ouvertes gèrent leur propre retour.
  useEffect(() => {
    // Bouton retour matériel : Android seulement (le web ne l'a pas)
    if (!guarded || Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      askQuit();
      return true;
    });
    return () => sub.remove();
  }, [guarded, askQuit]);

  const confirmQuit = () => {
    setQuitOpen(false);
    setLeaving(true);
  };

  // Une fois la protection levée (rendu suivant), on part pour de bon
  useEffect(() => {
    if (!leaving) return;
    if (pendingLeave.current) navigation.dispatch(pendingLeave.current);
    else leave();
  }, [leaving, navigation, leave]);

  // ---------------------------------------------------------------------------
  // Enchaînement des écrans
  // ---------------------------------------------------------------------------
  const goNext = () => {
    if (index >= screens.length - 1) return;
    setIndex((i) => i + 1);
    setDraft(null);
    setAnswered(false);
    setValOverride(null);
  };

  // Leçon découverte : rien à envoyer, l'écran de fin du parcours prend la main
  const onDiscoveryFinished = discovery?.onFinished;
  useEffect(() => {
    if (discoveryDone) onDiscoveryFinished?.();
  }, [discoveryDone, onDiscoveryFinished]);

  const handleFinish = async () => {
    if (discovery) {
      setFinishing(true);
      setDiscoveryDone(true);
      return;
    }
    if (!id || isSubmitting) return;
    setFinishing(true);
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
          // Liste vérifiée : la page module et l'accueil, encore montés sous le
          // lecteur, la relisent tout de suite
          if (!Array.isArray(modulesData)) return;
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
      type: typeOf(current),
      notion: current.notion ?? undefined,
      correct: draft.correct,
      raw: draft.raw,
    };
    const nextAnswers = [...answers, answer];
    const reaction = (draft.val !== undefined ? draft.val : draft.correct ? current.val.correct : current.val.wrong) ?? undefined;
    setAnswers(nextAnswers);
    // L'écran montre aussitôt sa correction, Val réagit (sans réplique
    // prévue : la sienne d'arrivée, avec l'humeur du verdict)
    setAnswered(true);
    const arrival = introLine(current, !!discovery, isLast);
    setValOverride(reaction ?? { line: arrival.line, mood: draft.correct ? 'celebrant' : 'rassurant' });
    const nextVerdict: Verdict = {
      correct: draft.correct,
      firstTry: isFirstTryCorrect(nextAnswers, screens, index),
      correctText: draft.correctText,
      explanation: (draft.explanation !== undefined ? draft.explanation : current.explanation) ?? undefined,
      val: reaction,
    };
    // Puis la feuille monte, en même temps que la vibration (montée
    // directement ouverte : une feuille montée fermée se démonterait)
    sheetTimer.current = setTimeout(() => {
      setVerdict(nextVerdict);
      setSheetOpen(true);
      if (nextVerdict.correct) successHaptic();
      else errorHaptic();
    }, SHEET_AFTER_VERDICT);
  };

  // Réponse complète sans bouton (dernière carte, dernière paire, réplique
  // choisie) : validée aussitôt
  const validateRef = useRef(handleValidate);
  useEffect(() => {
    validateRef.current = handleValidate;
  });
  useEffect(() => {
    if (draft?.autoSubmit && !answered) validateRef.current();
  }, [draft, answered]);

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
    // Écran non noté : on trace quand même le passage (jamais envoyé, voir
    // buildResponses). Le curseur d'estimation garde sa valeur : une
    // révélation suivante peut la rappeler (from_screen).
    if (!answers.some((a) => a.screenIndex === index)) {
      const raw = current.kind === 'reveal' ? { type: 'reveal', seen: true } : draft?.raw;
      if (raw !== undefined) {
        setAnswers((prev) => [...prev, { screenIndex: index, type: typeOf(current), correct: true, raw }]);
      }
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
      <EndFlowBoundary onDone={() => router.back()}>
        <LessonEndFlow
          result={result}
          streakBefore={streakBefore}
          moduleTitle={moduleTitle}
          onDone={() => router.back()}
        />
      </EndFlowBoundary>
    );
  }

  const notFound = !isLoading && !loadError && !current;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <LessonTopBar progress={progress} run={run} onClose={handleClose} />

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
          <View style={styles.stage}>
            {/* key : chaque écran est remonté (état neuf, entrée rejouée) */}
            <Animated.View
              key={index}
              entering={index > 0 ? SLIDE_IN : undefined}
              exiting={SLIDE_OUT}
              style={StyleSheet.absoluteFill}
            >
              <ScrollView
                ref={scrollRef}
                style={styles.scroll}
                // Après validation, de la place sous le contenu : feuille
                // repliée, les dernières options restent visibles au-dessus
                contentContainerStyle={[styles.scrollContent, answered && styles.scrollContentAnswered]}
                keyboardShouldPersistTaps="handled"
              >
                {/* Pastille seulement sur le premier écran d'une leçon découverte */}
                {discovery && index === 0 ? (
                  <Cascade index={RANK_VAL} delay={cascadeAt} style={styles.discoveryHead}>
                    <Pill size="badge" label="LEÇON DÉCOUVERTE" accessibilityLabel="Leçon découverte" background={colors.goldSoft} color={colors.gold} />
                  </Cascade>
                ) : null}
                {valLine ? (
                  <Cascade index={RANK_VAL} delay={cascadeAt} style={styles.val}>
                    <ValSays
                      line={valLine}
                      // Réaction : tout de suite ; arrivée : dans la cascade
                      bubbleDelay={valOverride ? 0 : cascadeAt + RANK_BUBBLE * motion.stagger}
                      typing={current.kind !== 'simulator' || !valOverride}
                    />
                  </Cascade>
                ) : null}
                <Cascade index={RANK_CONTENT} delay={cascadeAt} style={styles.content}>
                  <View style={styles.content} onLayout={(e) => (screenY.current = e.nativeEvent.layout.y)}>
                    <ScreenRenderer
                      screen={current}
                      answered={answered}
                      onDraftChange={setDraft}
                      scrollToY={scrollToY}
                      estimate={estimate}
                      enterDelay={enterDelay}
                      setVal={setValOverride}
                    />
                  </View>
                </Cascade>
              </ScrollView>
            </Animated.View>
          </View>

          <View style={styles.footer}>
            {submitError && !verdict ? (
              <AppText variant="callout" tone="error" accessibilityRole="alert" style={styles.footerError}>
                {submitError}
              </AppText>
            ) : null}
            {gradable ? (
              <Button
                label={primaryLabel(current)}
                onPress={handleValidate}
                disabled={!draft || answered}
                disabledReason={!draft ? validateHint(current) : undefined}
                silent
              />
            ) : (
              <Button
                label={submitError ? 'Réessayer' : primaryLabel(current)}
                onPress={handleContinue}
                loading={isLast && isSubmitting}
                disabled={!canContinue(current, draft !== null)}
                // Le pari dit déjà « Fais glisser pour parier »
                disabledReason={
                  current.kind === 'simulator' && !canContinue(current, draft !== null)
                    ? 'Bouge le curseur pour continuer.'
                    : undefined
                }
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
          onCollapsedChange={(collapsed) => {
            // Laisse la feuille finir de se replier, puis montre tout l'écran corrigé
            if (collapsed) setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), COLLAPSE_SCROLL_DELAY);
          }}
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
  // Scène des écrans : l'ancien et le nouveau s'y croisent en glissant
  stage: {
    flex: 1,
    overflow: 'hidden',
  },
  scroll: {
    flex: 1,
  },
  // Le contenu occupe toute la hauteur : rien ne reste vide en bas
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: space[5],
    paddingTop: space[2],
    paddingBottom: space[5],
  },
  scrollContentAnswered: {
    paddingBottom: COLLAPSED_SHEET_ROOM,
  },
  discoveryHead: {
    alignItems: 'flex-start',
    marginBottom: space[3],
  },
  val: {
    marginLeft: -space[1],
    marginBottom: space[4],
  },
  content: {
    flex: 1,
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
