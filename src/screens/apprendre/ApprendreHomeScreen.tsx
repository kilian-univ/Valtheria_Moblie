import { useRouter } from 'expo-router';
import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import GuestHome from '@/src/components/apprendre/home/GuestHome';
import { StatusBarShade } from '@/src/components/common/AppBackground';
import HomeHeader from '@/src/components/apprendre/home/HomeHeader';
import { ModuleRowsSkeleton, UpNextSkeleton } from '@/src/components/apprendre/home/HomeSkeleton';
import ModuleRow from '@/src/components/apprendre/home/ModuleRow';
import StreakSheet from '@/src/components/apprendre/home/StreakSheet';
import UniverseRow from '@/src/components/apprendre/home/UniverseRow';
import UpNextSection from '@/src/components/apprendre/home/UpNextSection';
import AppText from '@/src/components/common/AppText';
import PageState from '@/src/components/common/PageState';
import { SkeletonGroup } from '@/src/components/common/Skeleton';
import { StaggerItem } from '@/src/components/common/Stagger';
import { palette, space } from '@/src/constants/style/Style';
import { Lesson, Module, useApi } from '@/src/context/ApiContext';
import { useTheme } from '@/src/context/ThemeContext';
import { loadErrorMessage, OFFLINE_BANNER, OFFLINE_REASON, useLearningData } from '@/src/hooks/useLearningData';
import { useKnownPseudo } from '@/src/hooks/useKnownPseudo';
import { useLearningMemory } from '@/src/hooks/useLearningMemory';
import { useLessonLauncher } from '@/src/hooks/useLessonLauncher';
import { useDailyIgnite } from '@/src/state/flameIgnition';
import { useBestStreak } from '@/src/state/streakRewards';
import { onboardingStore, useOnboarding } from '@/src/state/onboarding';
import { DISCOVERY } from '@/src/lesson/discovery';
import {
  allTopicsDone,
  discoveryXp,
  doneToday,
  guestSubtitle,
  guestTitle,
  homeCard,
} from '@/src/utils/discoveryHome';
import { feedback } from '@/src/utils/feedback';
import { inProgressModules, pickUpNext, resolveHomeSituation } from '@/src/utils/learning';
import { isSignupClosed } from '@/src/utils/onboarding';
import { simulateStreak } from '@/src/utils/streakRewards';
import { modulesOutsideUniverses, visibleUniverses } from '@/src/utils/universes';

export default function ApprendreHomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const { user } = useApi();

  const data = useLearningData();
  // Dernier pseudo connu sur le téléphone : affiché tout de suite, sans saut
  const known = useKnownPseudo();
  const memory = useLearningMemory(user?.id);
  const { launch, startingId, launchError } = useLessonLauncher();
  const [refreshing, setRefreshing] = useState(false);
  // Sans compte : objectif choisi, leçons découvertes jouées, inscription fermée
  const onboarding = useOnboarding();
  // Flamme de série : allumage à sa première apparition de la journée
  const ignite = useDailyIgnite();
  // Compte connecté : meilleure série mémorisée (médailles gardées)
  const bestStreak = useBestStreak(data.isAuthenticated ? user?.id : null, data.streak);
  useEffect(() => {
    onboardingStore.load();
  }, []);

  // La mémoire locale (dernier module ouvert) dépend du profil : on l'attend
  // pour que « À suivre » ne change pas de module sous les yeux. Profil
  // indisponible (démarrage hors ligne) : on s'en passe.
  const memoryReady = memory.ready || (!user && !data.authPending);
  // Premier chargement : squelette immédiat, jamais d'écran vide. Les
  // rechargements, eux, gardent le contenu affiché (pas de squelette).
  const loading = data.isLoading || (data.isAuthenticated && !memoryReady);

  const situation = useMemo(
    () => resolveHomeSituation(data.modules, memory.lastModuleId, memory.celebrated),
    [data.modules, memory.lastModuleId, memory.celebrated]
  );

  // La fin d'un module n'est fêtée qu'une fois : affichée maintenant,
  // mémorisée pour les prochaines visites.
  const celebratedId = situation.kind === 'moduleDone' ? situation.finished.id : null;
  const { markCelebrated, markOpened } = memory;
  useEffect(() => {
    if (celebratedId !== null && !loading) markCelebrated(celebratedId);
  }, [celebratedId, loading, markCelebrated]);

  const openModule = (module: Module) =>
    router.push({ pathname: '/apprendre/module/[moduleId]', params: { moduleId: module.id } });

  const openUniverse = (universeId: number) =>
    router.push({ pathname: '/apprendre/univers/[universeId]', params: { universeId } });

  // Grande carte « À suivre » : advance doux
  const startLesson = (module: Module, lesson: Lesson) => {
    feedback.openLesson();
    markOpened(module.id);
    launch(lesson);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await data.reload();
    setRefreshing(false);
  };

  // Feuille de série : `streakMounted` reste vrai pendant l'animation de fermeture
  const [streakMounted, setStreakMounted] = useState(false);
  const [streakOpen, setStreakOpen] = useState(false);
  const closeStreak = useCallback(() => setStreakOpen(false), []);
  const unmountStreak = useCallback(() => setStreakMounted(false), []);
  const openStreak = () => {
    setStreakMounted(true);
    setStreakOpen(true);
  };
  const upNext = pickUpNext(data.modules, memory.lastModuleId);
  const continueStreak = () => {
    if (!upNext) return;
    // La feuille (un Modal) doit être fermée avant d'ouvrir le lecteur
    setStreakOpen(false);
    setStreakMounted(false);
    startLesson(upNext.module, upNext.lesson);
  };

  const isGuest = !data.isAuthenticated && !data.authPending;
  // Sans compte : prénom, leçon de l'objectif, série et XP du téléphone
  const guest = onboarding.state;
  const signupClosed = isSignupClosed(guest.signupClosedAt);

  const header = (
    <HomeHeader
      title={isGuest ? guestTitle(guest.firstName) : undefined}
      subtitle={
        isGuest ? guestSubtitle({ allDone: allTopicsDone(guest.played), doneToday: doneToday(guest.lessonDays) }) : undefined
      }
      ignite={ignite}
      pseudo={isGuest ? undefined : known.pseudo}
      pseudoPending={known.pending}
      stats={
        data.isAuthenticated && !loading
          ? { level: data.level, xp: data.xp, streak: data.streak, vals: data.vals }
          : undefined
      }
      statsLoading={data.isAuthenticated && loading}
      onStreak={openStreak}
      onAccount={() => router.push(data.isAuthenticated ? '/client/profil' : '/client/login')}
    />
  );

  let body: ReactNode;
  if (isGuest) {
    // Les leçons découvertes restent jouables à tout moment, même après la
    // première ouverture
    const card = homeCard({
      objective: guest.objective,
      started: guest.started,
      played: guest.played,
      signupClosed,
      universes: data.universes,
    });
    body = (
      <View style={styles.stack}>
        {header}
        <GuestHome
          card={card}
          universeSlug={DISCOVERY[card.objective].universe.slug}
          universes={data.universes}
          played={guest.played}
          history={simulateStreak(guest.lessonDays)}
          bestStreak={guest.bestStreak}
          lessonDays={guest.lessonDays}
          xp={discoveryXp(guest.played)}
          ignite={ignite}
          signupClosed={signupClosed}
          onPlay={(objective) =>
            router.push({ pathname: '/bienvenue/lecon', params: { objectif: objective, depuis: 'accueil' } })
          }
          onRegister={() => router.push('/client/register')}
          onLogin={() => router.push('/client/login')}
        />
      </View>
    );
  } else if (!loading && data.error) {
    body = (
      <View style={styles.stack}>
        {header}
        <StaggerItem index={0}>
          <PageState
            variant="error"
            title="Leçons indisponibles"
            message={loadErrorMessage(data.error)}
            onRetry={data.reload}
          />
        </StaggerItem>
      </View>
    );
  } else {
    // Le cadre (en-tête, intitulés) est réel tout de suite. Pendant le
    // chargement, ses emplacements reçoivent des squelettes (après 300 ms) ;
    // à l'arrivée, le contenu apparaît en cascade dans le même ordre.
    const upNextId = situation.kind === 'upNext' ? situation.module.id : null;
    const others = loading ? [] : inProgressModules(data.modules, upNextId);
    const showModules = loading || situation.kind !== 'empty';
    // Univers ayant au moins un module ; aucun (route absente, échec) : la
    // liste des modules, comme avant
    const universes = loading ? [] : visibleUniverses(data.universes, data.modules);
    const outside = modulesOutsideUniverses(universes, data.modules);

    body = (
      <>
        {header}
        {data.offline ? (
          <StaggerItem index={0}>
            <PageState variant="offline" text={OFFLINE_BANNER} style={styles.offline} />
          </StaggerItem>
        ) : null}

        <Section label="À suivre" spacing={space[6]}>
          {loading ? (
            <SkeletonGroup>
              <UpNextSkeleton />
            </SkeletonGroup>
          ) : (
            <StaggerItem index={0}>
              <UpNextSection
                situation={situation}
                offline={data.offline}
                startingId={startingId}
                launchError={launchError}
                onStartLesson={startLesson}
                onOpenModule={openModule}
                onOpenArticles={() => router.push('/article')}
              />
            </StaggerItem>
          )}
        </Section>

        {others.length > 0 ? (
          <StaggerItem index={1}>
            <Section label="Aussi en cours" spacing={space[8]}>
              <View style={styles.rows}>
                {others.map((module, i) => (
                  <ModuleRow key={module.id} module={module} last={i === others.length - 1} onPress={() => openModule(module)} />
                ))}
              </View>
            </Section>
          </StaggerItem>
        ) : null}

        {showModules && universes.length > 0 ? (
          <StaggerItem index={2}>
            <Section label="Univers" spacing={space[6]}>
              <View style={styles.rows}>
                {universes.map((entry, i) => (
                  <UniverseRow
                    key={entry.universe.id}
                    entry={entry}
                    last={i === universes.length - 1}
                    onPress={() => openUniverse(entry.universe.id)}
                  />
                ))}
              </View>
            </Section>
            {outside.length > 0 ? (
              <Section label="Autres modules" spacing={space[6]}>
                <View style={styles.rows}>
                  {outside.map((module, i) => (
                    <ModuleRow
                      key={module.id}
                      module={module}
                      last={i === outside.length - 1}
                      onPress={() => openModule(module)}
                    />
                  ))}
                </View>
              </Section>
            ) : null}
          </StaggerItem>
        ) : showModules ? (
          <Section label="Modules" spacing={space[6]}>
            {loading ? (
              <SkeletonGroup>
                <ModuleRowsSkeleton />
              </SkeletonGroup>
            ) : (
              <StaggerItem index={2}>
                <View style={styles.rows}>
                  {data.modules.map((module, i) => (
                    <ModuleRow
                      key={module.id}
                      module={module}
                      last={i === data.modules.length - 1}
                      onPress={() => openModule(module)}
                    />
                  ))}
                </View>
              </StaggerItem>
            )}
          </Section>
        ) : null}
      </>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + space[2] }]}
        refreshControl={
          data.isAuthenticated ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              // iOS : tintColor ; Android : colors + fond de la pastille
              tintColor={colors.gold}
              colors={[colors.gold]}
              progressBackgroundColor={colors.surface}
            />
          ) : undefined
        }
      >
        {body}
      </ScrollView>

      {streakMounted ? (
        <StreakSheet
          streak={data.streak}
          best={bestStreak}
          freezes={null}
          open={streakOpen}
          onRequestClose={closeStreak}
          onClosed={unmountStreak}
          onContinue={upNext ? continueStreak : undefined}
          continueDisabled={data.offline}
          continueDisabledReason={OFFLINE_REASON}
        />
      ) : null}

      {/* Rien ne passe sous la barre d'état en défilant */}
      <StatusBarShade tab="apprendre" />
    </View>
  );
}

function Section({ label, spacing, children }: { label: string; spacing: number; children: ReactNode }) {
  return (
    <View style={{ marginTop: spacing }}>
      <AppText variant="sectionLabel" accessibilityRole="header" style={styles.sectionLabel}>
        {label}
      </AppText>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingHorizontal: space[5],
    paddingBottom: space[10],
  },
  stack: {
    gap: space[6],
  },
  sectionLabel: {
    marginBottom: space[3],
  },
  offline: {
    marginTop: space[4],
    marginHorizontal: -space[5],
  },
  // Lignes pleine largeur : le texte s'aligne sur la marge de 20, le fond
  // pressé déborde jusqu'au bord
  rows: {
    marginHorizontal: -space[4],
  },
});
