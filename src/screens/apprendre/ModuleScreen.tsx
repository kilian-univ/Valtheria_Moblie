import { useLocalSearchParams, useRouter } from 'expo-router';
import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import GuestState from '@/src/components/apprendre/home/GuestState';
import LessonList from '@/src/components/apprendre/module/LessonList';
import LessonPath from '@/src/components/apprendre/module/LessonPath';
import LessonSheet from '@/src/components/apprendre/module/LessonSheet';
import ModuleHeader, { BackButton } from '@/src/components/apprendre/module/ModuleHeader';
import ModuleSkeleton, { NextBarSkeleton } from '@/src/components/apprendre/module/ModuleSkeleton';
import NextLessonBar from '@/src/components/apprendre/module/NextLessonBar';
import PageState from '@/src/components/common/PageState';
import { SkeletonGroup } from '@/src/components/common/Skeleton';
import { StaggerItem } from '@/src/components/common/Stagger';
import ValBubble from '@/src/components/common/ValBubble';
import { palette, space } from '@/src/constants/style/Style';
import { moduleDoneLine, pathLines, pickDailyLine } from '@/src/constants/valLines';
import { useApi } from '@/src/context/ApiContext';
import { useTheme } from '@/src/context/ThemeContext';
import { loadErrorMessage, OFFLINE_BANNER, OFFLINE_REASON, useLearningData } from '@/src/hooks/useLearningData';
import { useLearningMemory } from '@/src/hooks/useLearningMemory';
import { useLessonLauncher } from '@/src/hooks/useLessonLauncher';
import { warning } from '@/src/utils/haptics';
import {
  completedCount,
  currentLesson,
  findModule,
  lessonViews,
  LessonView,
  moduleState,
  nextModuleAfter,
  totalCount,
} from '@/src/utils/learning';

// Au-delà, les titres du zigzag débordent : on passe en liste verticale
const LIST_MODE_FONT_SCALE = 1.35;
const PATH_TOP_GAP = space[8];

export default function ModuleScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
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

  // Ouvrir un module l'enregistre comme dernier module ouvert
  const openedId = module?.id ?? null;
  useEffect(() => {
    if (openedId !== null) markOpened(openedId);
  }, [openedId, markOpened]);

  // Feuille : `sheetView` reste monté pendant l'animation de fermeture
  const [sheetView, setSheetView] = useState<LessonView | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const closeSheet = useCallback(() => setSheetOpen(false), []);
  const unmountSheet = useCallback(() => setSheetView(null), []);
  const openSheet = (view: LessonView) => {
    setSheetView(view);
    setSheetOpen(true);
  };

  // Fait défiler jusqu'au rond en cours, une seule fois
  // (les deux mesures arrivent dans un ordre quelconque : on attend les deux)
  const scrollRef = useRef<ScrollView>(null);
  const pathTop = useRef<number | null>(null);
  const currentY = useRef<number | null>(null);
  const scrolledToCurrent = useRef(false);
  const { height: windowHeight } = useWindowDimensions();
  const tryScrollToCurrent = () => {
    if (scrolledToCurrent.current || pathTop.current === null || currentY.current === null) return;
    scrolledToCurrent.current = true;
    const target = pathTop.current + currentY.current - windowHeight / 3;
    if (target > 0) scrollRef.current?.scrollTo({ y: target, animated: false });
  };
  const onCurrentY = (y: number) => {
    currentY.current = y;
    tryScrollToCurrent();
  };
  const onPathLayout = (y: number) => {
    pathTop.current = y;
    tryScrollToCurrent();
  };

  const [barHeight, setBarHeight] = useState(0);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/apprendre'));
  const openModule = (moduleIdToOpen: number) =>
    router.push({ pathname: '/apprendre/module/[moduleId]', params: { moduleId: moduleIdToOpen } });

  const startFromSheet = (view: LessonView) => {
    // La feuille (un Modal) doit être fermée avant d'ouvrir le lecteur
    setSheetOpen(false);
    setSheetView(null);
    launch(view.lesson);
  };

  const done = module ? moduleState(module) === 'done' : false;
  const next = module && done ? nextModuleAfter(data.modules, module.id) : null;
  const nextLesson = module ? currentLesson(module) : null;
  const remaining = module ? totalCount(module) - completedCount(module) : 0;

  let body: ReactNode;
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
    bar = (
      <SkeletonGroup style={styles.barSlot}>
        <NextBarSkeleton />
      </SkeletonGroup>
    );
  } else if (data.error) {
    body = (
      <PageState
        variant="error"
        title="Leçons indisponibles"
        message={loadErrorMessage(data.error)}
        onRetry={data.reload}
      />
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
    body = (
      <>
        <StaggerItem index={0}>
          <ModuleHeader info={{ title: module.title, done: completedCount(module), total: totalCount(module) }} />
        </StaggerItem>
        {data.offline ? (
          <StaggerItem index={1}>
            <PageState variant="offline" text={OFFLINE_BANNER} style={styles.offline} />
          </StaggerItem>
        ) : null}
        {done ? (
          <StaggerItem index={1}>
            <View style={styles.celebration}>
              <ValBubble
                mood="celebrant"
                title={moduleDoneLine.title}
                text={moduleDoneLine.text(module.title, next?.title ?? null)}
              />
            </View>
          </StaggerItem>
        ) : null}
        {/* Enfant direct du contenu défilant : onLayout donne la position utilisée
            pour amener la leçon en cours à l'écran */}
        <View style={styles.path} onLayout={(e) => onPathLayout(e.nativeEvent.layout.y)}>
          <StaggerItem index={2}>
            {listMode ? (
              <LessonList views={views} onOpen={openSheet} />
            ) : (
              <LessonPath
                views={views}
                onOpen={openSheet}
                onLocked={() => warning()}
                valLine={remaining === 1 ? pathLines.last : pickDailyLine(pathLines.general)}
                onCurrentY={onCurrentY}
              />
            )}
          </StaggerItem>
        </View>
      </>
    );

    if (nextLesson) {
      bar = (
        <NextLessonBar
          label={`Leçon suivante : ${nextLesson.title}`}
          onPress={() => launch(nextLesson)}
          loading={startingId === nextLesson.id}
          disabled={data.offline}
          disabledReason={OFFLINE_REASON}
          error={launchError}
          onHeight={setBarHeight}
        />
      );
    } else if (next) {
      bar = (
        <NextLessonBar
          label={`Module suivant : ${next.title}`}
          onPress={() => openModule(next.id)}
          onHeight={setBarHeight}
        />
      );
    }
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + space[2], paddingBottom: (bar ? barHeight : 0) + space[8] },
        ]}
      >
        {/* Toujours réel, chargement compris : ne rejoue pas d'apparition */}
        <BackButton onBack={goBack} />
        {body}
      </ScrollView>

      {bar}

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
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingHorizontal: space[5],
  },
  offline: {
    marginTop: space[4],
    marginHorizontal: -space[5],
  },
  celebration: {
    marginTop: space[6],
  },
  path: {
    marginTop: PATH_TOP_GAP,
  },
  // Emplacement du bouton du bas pendant le chargement (même place que NextLessonBar)
  barSlot: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  guest: {
    marginTop: space[6],
  },
});
