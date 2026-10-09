import { useIsFocused, useLocalSearchParams, useRouter } from 'expo-router';
import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import GuestState from '@/src/components/apprendre/home/GuestState';
import StatPills, { StatPillsSkeleton } from '@/src/components/apprendre/home/StatPills';
import StreakSheet from '@/src/components/apprendre/home/StreakSheet';
import LessonList from '@/src/components/apprendre/module/LessonList';
import LessonSheet from '@/src/components/apprendre/module/LessonSheet';
import { BackButton } from '@/src/components/apprendre/module/ModuleHeader';
import ModuleSkeleton from '@/src/components/apprendre/module/ModuleSkeleton';
import NextLessonBar from '@/src/components/apprendre/module/NextLessonBar';
import JumpButton from '@/src/components/apprendre/module/path/JumpButton';
import LessonCard from '@/src/components/apprendre/module/path/LessonCard';
import ModuleBanner from '@/src/components/apprendre/module/path/ModuleBanner';
import ModuleGuideSheet from '@/src/components/apprendre/module/path/ModuleGuideSheet';
import ModulePath from '@/src/components/apprendre/module/path/ModulePath';
import PageState from '@/src/components/common/PageState';
import { SkeletonGroup } from '@/src/components/common/Skeleton';
import { StaggerItem } from '@/src/components/common/Stagger';
import ValBubble from '@/src/components/common/ValBubble';
import { durations } from '@/src/constants/motion';
import { moduleColors, palette, space } from '@/src/constants/style/Style';
import { moduleDoneLine } from '@/src/constants/valLines';
import { useApi } from '@/src/context/ApiContext';
import { useTheme } from '@/src/context/ThemeContext';
import { loadErrorMessage, OFFLINE_BANNER, OFFLINE_REASON, useLearningData } from '@/src/hooks/useLearningData';
import { useLearningMemory } from '@/src/hooks/useLearningMemory';
import { useLessonLauncher } from '@/src/hooks/useLessonLauncher';
import { forgetLaunch, peekLaunch, rememberLaunch } from '@/src/state/pathSnapshot';
import { currentLesson, findModule, lessonViews, LessonView, moduleState, nextModuleAfter } from '@/src/utils/learning';
import {
  moduleColorKey,
  moduleNumber,
  Rect,
  Unlock,
  unlockTransition,
  visibility,
  Visibility,
} from '@/src/utils/modulePath';

// Au-delà, les titres débordent : on passe en liste verticale
const LIST_MODE_FONT_SCALE = 1.35;
// Carte de leçon : le rond visé est amené à 22 % de la hauteur visible
const CARD_ANCHOR = 0.22;
const CARD_GAP = 12;
// Défilement automatique vers la leçon en cours, une fois les ronds apparus
const ARRIVAL_SCROLL_DELAY = durations.stagger * 5;

export default function ModuleScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  const reduced = useReducedMotion();
  const focused = useIsFocused();
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const { user } = useApi();
  const { moduleId } = useLocalSearchParams<{ moduleId: string }>();
  const id = Number(moduleId);

  const data = useLearningData();
  const { markOpened } = useLearningMemory(user?.id);
  const { launch, startingId, launchError } = useLessonLauncher();

  const module = findModule(data.modules, Number.isFinite(id) ? id : null);
  const views = useMemo(() => (module ? lessonViews(module) : []), [module]);
  const listMode = fontScale >= LIST_MODE_FONT_SCALE;
  const tint = module ? moduleColors[moduleColorKey(data.modules, module.id)] : moduleColors.ardoise;
  const number = module ? moduleNumber(data.modules, module.id) : null;

  // Ouvrir un module l'enregistre comme dernier module ouvert
  const openedId = module?.id ?? null;
  useEffect(() => {
    if (openedId !== null) markOpened(openedId);
  }, [openedId, markOpened]);

  // ---------------------------------------------------------------------------
  // Retour d'une leçon réussie : on compare avec l'état au lancement, une
  // fois l'écran de nouveau affiché
  // ---------------------------------------------------------------------------
  const [played, setPlayed] = useState<Unlock | null>(null);
  const pending = focused && module && !played ? unlockTransition(peekLaunch(module.id), views) : null;
  // Gardé dans l'état pendant le rendu (motif React « ajuster l'état ») : les
  // ronds reçoivent l'animation dès ce rendu-ci
  if (pending) setPlayed(pending);
  const unlock = played ?? pending;
  const playedModuleId = played && module ? module.id : null;
  useEffect(() => {
    // Joué : on oublie l'état au lancement
    if (playedModuleId !== null) forgetLaunch(playedModuleId);
  }, [playedModuleId]);

  const startLesson = (view: LessonView) => {
    if (module) {
      rememberLaunch(
        module.id,
        views.filter((v) => v.status === 'completed').map((v) => v.lesson.id)
      );
    }
    setPlayed(null);
    launch(view.lesson);
  };

  // ---------------------------------------------------------------------------
  // Mesures du défilement
  // ---------------------------------------------------------------------------
  const scrollRef = useRef<ScrollView>(null);
  const [scrollTop, setScrollTop] = useState(0); // haut du ScrollView dans l'écran
  const viewport = useRef(0);
  const contentHeight = useRef(0);
  const bannerHeight = useRef(0);
  const scrollY = useRef(0);
  const [pathTop, setPathTop] = useState<number | null>(null);
  const [pathWidth, setPathWidth] = useState(0);
  const [focusRect, setFocusRect] = useState<Rect | null>(null);
  const [focusSide, setFocusSide] = useState<Visibility>('visible');

  const updateSide = useCallback(() => {
    if (pathTop === null || !focusRect || viewport.current === 0) return;
    const visibleTop = scrollY.current + bannerHeight.current;
    const side = visibility(pathTop + focusRect.y, focusRect.h, visibleTop, viewport.current - bannerHeight.current);
    setFocusSide((s) => (s === side ? s : side));
  }, [pathTop, focusRect]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollY.current = e.nativeEvent.contentOffset.y;
    updateSide();
  };

  const scrollToFocus = useCallback(
    (animated: boolean) => {
      if (pathTop === null || !focusRect) return;
      const target = pathTop + focusRect.y - viewport.current / 3;
      scrollRef.current?.scrollTo({ y: Math.max(0, target), animated });
    },
    [pathTop, focusRect]
  );

  // Arrivée : une seule fois, après la cascade des ronds
  const arrived = useRef(false);
  useEffect(() => {
    if (arrived.current || pathTop === null || !focusRect || listMode) return;
    arrived.current = true;
    const timer = setTimeout(() => scrollToFocus(!reduced), reduced ? 0 : ARRIVAL_SCROLL_DELAY);
    return () => clearTimeout(timer);
  }, [pathTop, focusRect, listMode, reduced, scrollToFocus]);

  useEffect(() => {
    updateSide();
  }, [updateSide]);

  // ---------------------------------------------------------------------------
  // Carte de leçon (chemin) et feuille (mode liste)
  // ---------------------------------------------------------------------------
  const [card, setCard] = useState<{ view: LessonView; top: number; pointX: number } | null>(null);

  const openCard = (view: LessonView, rect: Rect) => {
    if (pathTop === null) return;
    const nodeTop = pathTop + rect.y;
    const maxScroll = Math.max(0, contentHeight.current - viewport.current);
    const target = Math.min(maxScroll, Math.max(0, nodeTop - viewport.current * CARD_ANCHOR));
    scrollRef.current?.scrollTo({ y: target, animated: false });
    scrollY.current = target;
    setCard({
      view,
      top: scrollTop + nodeTop - target + rect.h + CARD_GAP,
      pointX: space[5] + rect.x + rect.w / 2,
    });
  };
  const closeCard = () => setCard(null);

  const [sheetView, setSheetView] = useState<LessonView | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const closeSheet = useCallback(() => setSheetOpen(false), []);
  const unmountSheet = useCallback(() => setSheetView(null), []);
  const openSheet = (view: LessonView) => {
    setSheetView(view);
    setSheetOpen(true);
  };
  const startFromSheet = (view: LessonView) => {
    // La feuille (un Modal) doit être fermée avant d'ouvrir le lecteur
    setSheetOpen(false);
    setSheetView(null);
    startLesson(view);
  };
  const startFromCard = (view: LessonView) => {
    setCard(null);
    startLesson(view);
  };

  const [guideMounted, setGuideMounted] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const closeGuide = useCallback(() => setGuideOpen(false), []);
  const unmountGuide = useCallback(() => setGuideMounted(false), []);
  const openGuide = () => {
    setGuideMounted(true);
    setGuideOpen(true);
  };

  const [streakMounted, setStreakMounted] = useState(false);
  const [streakOpen, setStreakOpen] = useState(false);
  const closeStreak = useCallback(() => setStreakOpen(false), []);
  const unmountStreak = useCallback(() => setStreakMounted(false), []);
  const openStreak = () => {
    setStreakMounted(true);
    setStreakOpen(true);
  };

  const [barHeight, setBarHeight] = useState(0);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/apprendre'));
  const openModule = (moduleIdToOpen: number) =>
    router.push({ pathname: '/apprendre/module/[moduleId]', params: { moduleId: moduleIdToOpen } });

  const done = module ? moduleState(module) === 'done' : false;
  const next = module && done ? nextModuleAfter(data.modules, module.id) : null;
  const nextLesson = module ? currentLesson(module) : null;
  const currentView = views.find((v) => v.status === 'current') ?? null;

  const continueStreak = () => {
    if (!currentView) return;
    setStreakOpen(false);
    setStreakMounted(false);
    startLesson(currentView);
  };

  // ---------------------------------------------------------------------------
  // Contenu
  // ---------------------------------------------------------------------------
  let extras: ReactNode = null;
  let body: ReactNode = null;
  let bar: ReactNode = null;

  if (!data.isAuthenticated && !data.authPending) {
    body = (
      <View style={styles.guest}>
        <GuestState onRegister={() => router.push('/client/register')} onLogin={() => router.push('/client/login')} />
      </View>
    );
  } else if (data.isLoading) {
    // Premier chargement : squelette immédiat (le retour, lui, reste réel)
    body = (
      <SkeletonGroup>
        <ModuleSkeleton />
      </SkeletonGroup>
    );
  } else if (data.error) {
    body = (
      <PageState variant="error" title="Leçons indisponibles" message={loadErrorMessage(data.error)} onRetry={data.reload} />
    );
  } else if (!module) {
    body = (
      <PageState
        variant="error"
        title="Module introuvable"
        message="Ce module n'est plus disponible."
        retryLabel="Retour aux modules"
        onRetry={() => router.replace('/apprendre')}
      />
    );
  } else {
    extras = (
      <>
        {data.offline ? <PageState variant="offline" text={OFFLINE_BANNER} style={styles.offline} /> : null}
        {done ? (
          <View style={styles.celebration}>
            <ValBubble
              mood="celebrant"
              title={moduleDoneLine.title}
              text={moduleDoneLine.text(module.title, next?.title ?? null)}
            />
          </View>
        ) : null}
      </>
    );

    body = listMode ? (
      <StaggerItem index={0}>
        <View style={styles.list}>
          <LessonList views={views} onOpen={openSheet} />
        </View>
      </StaggerItem>
    ) : (
      <ModulePath
        views={views}
        colors={tint}
        width={pathWidth}
        unlock={unlock}
        onOpen={openCard}
        onFocusRect={setFocusRect}
      />
    );

    if (listMode && nextLesson && currentView) {
      bar = (
        <NextLessonBar
          label={`Leçon suivante : ${nextLesson.title}`}
          onPress={() => startLesson(currentView)}
          loading={startingId === nextLesson.id}
          disabled={data.offline}
          disabledReason={OFFLINE_REASON}
          error={launchError}
          onHeight={setBarHeight}
        />
      );
    } else if (next) {
      bar = <NextLessonBar label={`Module suivant : ${next.title}`} onPress={() => openModule(next.id)} onHeight={setBarHeight} />;
    }
  }

  const showStats = data.isAuthenticated;
  const showJump = !listMode && !card && module && currentView && focusSide !== 'visible';

  return (
    <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <ScrollView
        ref={scrollRef}
        stickyHeaderIndices={[1]}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onLayout={(e) => {
          viewport.current = e.nativeEvent.layout.height;
          setScrollTop(e.nativeEvent.layout.y);
          updateSide();
        }}
        onContentSizeChange={(_w, h) => {
          contentHeight.current = h;
        }}
        contentContainerStyle={{ paddingBottom: (bar ? barHeight : 0) + space[8] }}
      >
        {/* 0. Retour et pastilles : toujours réels, chargement compris */}
        <View style={styles.topRow}>
          <BackButton onBack={goBack} />
          <View style={styles.pills}>
            {showStats && !data.isLoading ? (
              <StatPills streak={data.streak} vals={data.vals} onStreak={openStreak} />
            ) : showStats ? (
              <StatPillsSkeleton />
            ) : null}
          </View>
        </View>

        {/* 1. Bannière, fixée en haut au défilement */}
        <View
          style={[styles.bannerSlot, { backgroundColor: colors.background }]}
          onLayout={(e) => {
            bannerHeight.current = e.nativeEvent.layout.height;
          }}
        >
          {module ? (
            <ModuleBanner label={number ? `MODULE ${number}` : null} title={module.title} colors={tint} onGuide={openGuide} />
          ) : null}
        </View>

        {/* 2. Bandeau hors ligne, module terminé */}
        <View style={styles.padded}>{extras}</View>

        {/* 3. Chemin (ou liste, ou état de la page) */}
        <View
          style={styles.padded}
          onLayout={(e) => {
            setPathTop(e.nativeEvent.layout.y);
            setPathWidth(e.nativeEvent.layout.width - 2 * space[5]);
          }}
        >
          {body}
        </View>
      </ScrollView>

      {bar}

      {showJump ? (
        <View style={[styles.jump, { bottom: (bar ? barHeight : 0) + space[4] }]}>
          <JumpButton direction={focusSide === 'above' ? 'up' : 'down'} onPress={() => scrollToFocus(!reduced)} />
        </View>
      ) : null}

      {card ? (
        <LessonCard
          view={card.view}
          colors={tint}
          top={card.top}
          pointX={card.pointX}
          onClose={closeCard}
          onStart={startFromCard}
          disabled={data.offline}
          disabledReason={OFFLINE_REASON}
          loading={startingId === card.view.lesson.id}
        />
      ) : null}

      {guideMounted && module ? (
        <ModuleGuideSheet
          title={module.title}
          description={typeof module.description === 'string' && module.description.trim() ? module.description.trim() : null}
          views={views}
          colors={tint}
          open={guideOpen}
          onRequestClose={closeGuide}
          onClosed={unmountGuide}
        />
      ) : null}

      {sheetView ? (
        <LessonSheet
          view={sheetView}
          open={sheetOpen}
          onRequestClose={closeSheet}
          onClosed={unmountSheet}
          onStart={startFromSheet}
          startDisabled={data.offline}
          startDisabledReason={OFFLINE_REASON}
        />
      ) : null}

      {streakMounted ? (
        <StreakSheet
          streak={data.streak}
          open={streakOpen}
          onRequestClose={closeStreak}
          onClosed={unmountStreak}
          onContinue={currentView ? continueStreak : undefined}
          continueDisabled={data.offline}
          continueDisabledReason={OFFLINE_REASON}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space[5],
    paddingTop: space[2],
  },
  pills: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
  },
  bannerSlot: {
    paddingHorizontal: space[5],
    paddingTop: space[3],
    paddingBottom: space[3],
  },
  padded: {
    paddingHorizontal: space[5],
  },
  offline: {
    marginTop: space[2],
    marginHorizontal: -space[5],
  },
  celebration: {
    marginTop: space[4],
  },
  list: {
    marginTop: space[4],
  },
  guest: {
    marginTop: space[6],
  },
  jump: {
    position: 'absolute',
    right: space[5],
  },
});
