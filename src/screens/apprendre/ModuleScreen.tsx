import { useIsFocused, useLocalSearchParams, useRouter } from 'expo-router';
import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useReducedMotion, useSharedValue } from 'react-native-reanimated';
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
import { durations } from '@/src/constants/motion';
import AppText from '@/src/components/common/AppText';
import { fonts, moduleColors, palette, space } from '@/src/constants/style/Style';
import { useApi } from '@/src/context/ApiContext';
import { useBestStreak } from '@/src/state/streakRewards';
import { useTheme } from '@/src/context/ThemeContext';
import { loadErrorMessage, OFFLINE_BANNER, OFFLINE_REASON, useLearningData } from '@/src/hooks/useLearningData';
import { useLearningMemory } from '@/src/hooks/useLearningMemory';
import { useLessonLauncher } from '@/src/hooks/useLessonLauncher';
import { moduleUniverse } from '@/src/lesson/normalize';
import { forgetLaunch, peekLaunch, rememberLaunch } from '@/src/state/pathSnapshot';
import { currentLesson, findModule, lessonViews, LessonView } from '@/src/utils/learning';
import {
  bannerLabel,
  followingModule,
  moduleColorKey,
  moduleNumber,
  Rect,
  Unlock,
  unlockTransition,
  Visibility,
  visibility,
} from '@/src/utils/modulePath';
import { universeBannerLabel } from '@/src/utils/universes';

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
  // Meilleure série mémorisée (médailles gardées si la série casse)
  const bestStreak = useBestStreak(data.isAuthenticated ? user?.id : null, data.streak);
  const { markOpened } = useLearningMemory(user?.id);
  const { launch, startingId, launchError } = useLessonLauncher();

  const module = findModule(data.modules, Number.isFinite(id) ? id : null);
  const views = useMemo(() => (module ? lessonViews(module) : []), [module]);
  const listMode = fontScale >= LIST_MODE_FONT_SCALE;
  const tint = module ? moduleColors[moduleColorKey(data.modules, module.id, data.universes)] : moduleColors.ardoise;
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
  // L'en-tête est fixe, posé sur le haut du ScrollView : la zone utile
  // commence sous lui
  const viewport = useRef(0);
  const [viewportH, setViewportH] = useState(0);
  const contentHeight = useRef(0);
  const [headerH, setHeaderH] = useState(0);
  const scrollY = useRef(0);
  // Même défilement, côté animations (effet de profondeur des décors)
  const scrollSV = useSharedValue(0);
  const [pathTop, setPathTop] = useState<number | null>(null);
  const [pathWidth, setPathWidth] = useState(0);
  const [focusRect, setFocusRect] = useState<Rect | null>(null);
  const [focusSide, setFocusSide] = useState<Visibility>('visible');

  const updateSide = useCallback(() => {
    if (pathTop === null || !focusRect || viewport.current === 0) return;
    const side = visibility(pathTop + focusRect.y, focusRect.h, scrollY.current, viewport.current);
    setFocusSide((s) => (s === side ? s : side));
  }, [pathTop, focusRect]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollY.current = e.nativeEvent.contentOffset.y;
    scrollSV.set(scrollY.current);
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
    const anchor = viewport.current * CARD_ANCHOR;
    const target = Math.min(maxScroll, Math.max(0, nodeTop - anchor));
    scrollRef.current?.scrollTo({ y: target, animated: false });
    scrollY.current = target;
    scrollSV.set(target);
    setCard({
      view,
      // La carte est posée dans l'écran : sous l'en-tête
      top: headerH + nodeTop - target + rect.h + CARD_GAP,
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
  const following = module ? followingModule(data.modules, module.id) : null;
  const followingTint = following ? moduleColors[moduleColorKey(data.modules, following.id, data.universes)] : null;

  let extras: ReactNode = null;
  let body: ReactNode = null;
  let after: ReactNode = null;
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
    extras = data.offline ? <PageState variant="offline" text={OFFLINE_BANNER} style={styles.offline} /> : null;

    body = listMode ? (
      <StaggerItem index={0}>
        <View style={styles.list}>
          <LessonList views={views} onOpen={openSheet} />
        </View>
      </StaggerItem>
    ) : (
      <ModulePath
        moduleId={module.id}
        views={views}
        colors={tint}
        width={pathWidth}
        unlock={unlock}
        onOpen={openCard}
        onFocusRect={setFocusRect}
        scrollY={scrollSV}
        viewport={viewportH}
        pathTop={pathTop ?? 0}
      />
    );

    // Après le trophée : le module suivant, dans sa propre couleur
    if (following && followingTint) {
      const followingViews = lessonViews(following);
      const followingDone = followingViews.filter((v) => v.status === 'completed').length;
      after = (
        <View style={styles.after}>
          <View style={styles.separator} accessibilityRole="header">
            <View style={[styles.separatorRule, { backgroundColor: colors.border }]} />
            <AppText tone="subtitle" style={styles.separatorText}>
              Module suivant
            </AppText>
            <View style={[styles.separatorRule, { backgroundColor: colors.border }]} />
          </View>
          <ModuleBanner
            label={bannerLabel(moduleNumber(data.modules, following.id), followingDone, followingViews.length)}
            title={following.title}
            progress={followingViews.length ? followingDone / followingViews.length : 0}
            colors={followingTint}
            onPress={() => openModule(following.id)}
            accessibilityHint="Ouvre ce module"
          />
        </View>
      );
    }

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
    }
  }

  const showStats = data.isAuthenticated;
  const showJump = !listMode && !card && module && currentView && focusSide !== 'visible';
  const doneCount = views.filter((v) => v.status === 'completed').length;

  return (
    <View style={styles.screen}>
      {/* Le contenu défile sous l'en-tête, sans passer derrière lui : aucune
          bande de couleur, le fond commun se voit partout */}
      <ScrollView
        ref={scrollRef}
        style={{ marginTop: headerH }}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onLayout={(e) => {
          viewport.current = e.nativeEvent.layout.height;
          setViewportH(e.nativeEvent.layout.height);
          updateSide();
        }}
        onContentSizeChange={(_w, h) => {
          contentHeight.current = h;
        }}
        contentContainerStyle={{ paddingBottom: space[8] }}
      >
        {/* Bandeau hors ligne */}
        <View style={styles.padded}>{extras}</View>

        {/* Chemin (ou liste, ou état de la page) */}
        <View
          style={styles.padded}
          onLayout={(e) => {
            setPathTop(e.nativeEvent.layout.y);
            setPathWidth(e.nativeEvent.layout.width - 2 * space[5]);
          }}
        >
          {body}
        </View>

        {after}
      </ScrollView>

      {/* En-tête fixe : retour, pastilles, bannière, sur le fond commun */}
      <View style={styles.header} onLayout={(e) => setHeaderH(e.nativeEvent.layout.height)}>
        <View style={{ paddingTop: insets.top }}>
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
          <View style={styles.bannerSlot}>
            {module ? (
              <ModuleBanner
                universe={universeBannerLabel(moduleUniverse(module)?.name)}
                label={bannerLabel(number, doneCount, views.length)}
                title={module.title}
                progress={views.length ? doneCount / views.length : 0}
                colors={tint}
                onGuide={openGuide}
              />
            ) : null}
          </View>
          <View style={styles.headerGap} />
        </View>
      </View>

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
          best={bestStreak}
          freezes={null}
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

// Marge sous la bannière, avant le contenu qui défile
const HEADER_GAP = 12;
const SEPARATOR_TEXT = 13;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  headerGap: {
    height: HEADER_GAP,
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
  },
  padded: {
    paddingHorizontal: space[5],
  },
  offline: {
    marginTop: space[2],
    marginHorizontal: -space[5],
  },
  list: {
    marginTop: space[4],
  },
  guest: {
    marginTop: space[6],
  },
  after: {
    paddingHorizontal: space[5],
    paddingTop: space[4],
    paddingBottom: space[10],
    gap: space[4],
  },
  separator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
  },
  separatorRule: {
    flex: 1,
    height: 1,
  },
  separatorText: {
    fontFamily: fonts.bodyBold,
    fontSize: SEPARATOR_TEXT,
    lineHeight: 18,
  },
  jump: {
    position: 'absolute',
    right: space[5],
  },
});
