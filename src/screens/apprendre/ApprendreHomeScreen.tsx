import { useRouter } from 'expo-router';
import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import GuestHome from '@/src/components/apprendre/home/GuestHome';
import { StatusBarShade } from '@/src/components/common/AppBackground';
import HomeHeader from '@/src/components/apprendre/home/HomeHeader';
import DailyProgram from '@/src/components/apprendre/home/DailyProgram';
import { CarouselSkeleton, ProgramSkeleton } from '@/src/components/apprendre/home/HomeSkeleton';
import LearnTopBar from '@/src/components/apprendre/home/LearnTopBar';
import ModuleRow from '@/src/components/apprendre/home/ModuleRow';
import StreakSheet from '@/src/components/apprendre/home/StreakSheet';
import UniverseCarousel from '@/src/components/apprendre/home/UniverseCarousel';
import WordOfDayLine from '@/src/components/apprendre/home/WordOfDayLine';
import AppText from '@/src/components/common/AppText';
import Button from '@/src/components/common/Button';
import PageState from '@/src/components/common/PageState';
import { SkeletonGroup } from '@/src/components/common/Skeleton';
import { StaggerItem } from '@/src/components/common/Stagger';
import { moduleColors, palette, space } from '@/src/constants/style/Style';
import { Lesson, Module, useApi } from '@/src/context/ApiContext';
import { useTheme } from '@/src/context/ThemeContext';
import { useDailyRevision } from '@/src/hooks/useDailyRevision';
import { useDictionary } from '@/src/hooks/useDictionary';
import { loadErrorMessage, OFFLINE_BANNER, OFFLINE_REASON, useLearningData } from '@/src/hooks/useLearningData';
import { useKnownPseudo } from '@/src/hooks/useKnownPseudo';
import { useLearningMemory } from '@/src/hooks/useLearningMemory';
import { useLessonLauncher } from '@/src/hooks/useLessonLauncher';
import { useDailyIgnite } from '@/src/state/flameIgnition';
import { useBestStreak } from '@/src/state/streakRewards';
import { onboardingStore, useOnboarding } from '@/src/state/onboarding';
import { DISCOVERY, toObjective } from '@/src/lesson/discovery';
import { dayCelebrated, markDayCelebrated } from '@/src/state/dayCelebration';
import { useStoredObjective } from '@/src/state/objective';
import { userKeyOf } from '@/src/state/userMemory';
import { carouselOrder, pickLessonOfDay, programState } from '@/src/utils/dailyProgram';
import { localDay } from '@/src/utils/day';
import { wordOfTheDay } from '@/src/utils/dictionary';
import { termHref } from '@/src/utils/dictionaryLinks';
import { celebrate } from '@/src/utils/haptics';
import { moduleColorKey } from '@/src/utils/modulePath';
import {
  allTopicsDone,
  discoveryXp,
  doneToday,
  guestSubtitle,
  guestTitle,
  homeCard,
} from '@/src/utils/discoveryHome';
import { feedback } from '@/src/utils/feedback';
import { resolveHomeSituation } from '@/src/utils/learning';
import { isSignupClosed } from '@/src/utils/onboarding';
import { simulateStreak } from '@/src/utils/streakRewards';
import { visibleUniverses } from '@/src/utils/universes';

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

  const { markOpened } = memory;

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
  // Programme du jour : leçon du jour et révision (mémoire du téléphone)
  const revision = useDailyRevision(data.isAuthenticated ? user?.id : null);
  const storedObjective = useStoredObjective(userKeyOf(user?.id));
  const objective = storedObjective ?? toObjective(user?.objective) ?? onboarding.state.objective ?? null;
  const objectiveSlug = objective ? DISCOVERY[objective].universe.slug : null;
  const lessonOfDay = pickLessonOfDay({
    modules: data.modules,
    universes: data.universes,
    log: revision.log,
    lastModuleId: memory.lastModuleId,
    objectiveSlug,
  });
  // Plus de leçon disponible : le programme ne compte que la révision
  const program = programState(revision.lessonDone, revision.revisionDone, lessonOfDay !== null);
  const dictionary = useDictionary();
  const word = wordOfTheDay(dictionary.entries, new Date());

  // Journée faite (leçon et révision, ou la révision seule quand il n'y a
  // plus de leçon) : fêtée une fois, avec la phrase de Val
  const bothDone = data.isAuthenticated && program.dayDone;
  useEffect(() => {
    if (!bothDone || !user) return;
    const key = userKeyOf(user.id);
    const today = localDay(new Date());
    dayCelebrated(key, today).then((done) => {
      if (done) return;
      markDayCelebrated(key, today);
      celebrate();
    });
  }, [bothDone, user]);

  const openRevision = () => {
    feedback.openLesson();
    router.push('/apprendre/revision');
  };

  const continueStreak = () => {
    if (!lessonOfDay) return;
    // La feuille (un Modal) doit être fermée avant d'ouvrir le lecteur
    setStreakOpen(false);
    setStreakMounted(false);
    startLesson(lessonOfDay.module, lessonOfDay.lesson);
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

  // En-tête du compte connecté : logo, série, Vals, photo dans l'anneau de niveau
  const topBar = (
    <LearnTopBar
      pseudo={known.pseudo}
      stats={loading ? null : { xp: data.xp, streak: data.streak, vals: data.vals }}
      ignite={ignite}
      onStreak={openStreak}
      onProfile={() => router.push('/client/profil')}
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
        {topBar}
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
    const universes = loading ? [] : carouselOrder(visibleUniverses(data.universes, data.modules), objectiveSlug, revision.log);
    const lessonColor = lessonOfDay
      ? moduleColors[moduleColorKey(data.modules, lessonOfDay.module.id, data.universes)].face
      : colors.gold;

    body = (
      <>
        {topBar}
        {data.offline ? (
          <StaggerItem index={0}>
            <PageState variant="offline" text={OFFLINE_BANNER} style={styles.offline} />
          </StaggerItem>
        ) : null}

        <View style={styles.program}>
          {loading ? (
            <SkeletonGroup>
              <ProgramSkeleton />
            </SkeletonGroup>
          ) : (
            <StaggerItem index={0}>
              <DailyProgram
                program={program}
                lesson={lessonOfDay}
                color={lessonColor}
                revisionCount={revision.count}
                revisionEmptyText={revision.emptyText}
                revisionDoneText={revision.doneText}
                offline={data.offline}
                starting={lessonOfDay !== null && startingId === lessonOfDay.lesson.id}
                launchError={launchError}
                onStartLesson={() => lessonOfDay && startLesson(lessonOfDay.module, lessonOfDay.lesson)}
                onRevise={openRevision}
              />
            </StaggerItem>
          )}
        </View>

        {word && !loading ? (
          <StaggerItem index={1}>
            <View style={styles.word}>
              <WordOfDayLine term={word.term} onPress={() => router.push(termHref(word.term))} />
            </View>
          </StaggerItem>
        ) : null}

        {loading || universes.length > 0 ? (
          <StaggerItem index={2}>
            <View style={styles.sectionHead}>
              <AppText variant="sectionLabel" accessibilityRole="header">
                Tes univers
              </AppText>
              {loading ? null : (
                <Button variant="link" label="Tout voir" strong onPress={() => router.push('/apprendre/univers')} />
              )}
            </View>
            {loading ? (
              <SkeletonGroup>
                <CarouselSkeleton />
              </SkeletonGroup>
            ) : (
              <UniverseCarousel
                entries={universes}
                objectiveSlug={objectiveSlug}
                bleed={space[5]}
                onOpen={(u) => openUniverse(u.id)}
              />
            )}
          </StaggerItem>
        ) : situation.kind !== 'empty' ? (
          // Pas d'univers (route absente, échec) : la liste des modules
          <Section label="Modules" spacing={space[8]}>
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
          onContinue={lessonOfDay ? continueStreak : undefined}
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
  program: {
    marginTop: space[4],
  },
  word: {
    marginTop: space[3],
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: space[5],
    marginBottom: space[2],
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
