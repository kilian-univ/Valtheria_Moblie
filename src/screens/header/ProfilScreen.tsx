import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import StreakSheet from '@/src/components/apprendre/home/StreakSheet';
import AppText from '@/src/components/common/AppText';
import BackButton from '@/src/components/common/BackButton';
import Button from '@/src/components/common/Button';
import IconButton from '@/src/components/common/IconButton';
import LoadErrorState from '@/src/components/common/LoadErrorState';
import PageState from '@/src/components/common/PageState';
import { ProfileSkeleton } from '@/src/components/common/ScreenSkeletons';
import UniverseCard from '@/src/components/common/UniverseCard';
import AccessTile, { IconSquare } from '@/src/components/profile/AccessTile';
import HeaderGlow from '@/src/components/profile/HeaderGlow';
import ObjectiveSheet from '@/src/components/profile/ObjectiveSheet';
import ProfileAvatar from '@/src/components/profile/ProfileAvatar';
import StatBand from '@/src/components/profile/StatBand';
import WeekChart from '@/src/components/profile/WeekChart';
import { fonts, palette, radius, space, titleLetterSpacing, withOpacity } from '@/src/constants/style/Style';
import { useApi } from '@/src/context/ApiContext';
import { useTheme } from '@/src/context/ThemeContext';
import { useLessonLauncher } from '@/src/hooks/useLessonLauncher';
import { useProfile } from '@/src/hooks/useProfile';
import BudgetStepsCard from '@/src/components/profile/BudgetStepsCard';
import PatrimoineStepsCard from '@/src/components/profile/PatrimoineStepsCard';
import MedalsCard from '@/src/components/profile/MedalsCard';
import { useAccuracy } from '@/src/state/accuracy';
import { useSession } from '@/src/state/session';
import { wordCountsLabel } from '@/src/utils/wordStates';
import { discoveryLesson, type Objective } from '@/src/lesson/discovery';
import { initialOf, lastMedalDays, levelA11y, medalsEarned } from '@/src/utils/profile';
import { universeTint } from '@/src/utils/universeTint';

const AVATAR = 104;
const PSEUDO_SIZE = 28;
// Petit message après un changement d'objectif
const NOTICE_MS = 2600;
// Lueur dorée : son centre sur la photo
const GLOW_TOP = -space[8];

// Profil, version 4 (écran poussé, fond commun) : l'en-tête centré (photo
// dans l'anneau de niveau, pseudo, pastille du niveau) sur une lueur dorée,
// la bande série · XP · Vals, la carte de l'objectif (UniverseCard), la
// semaine en barres, puis les accès au carnet, aux médailles et aux mots.
// États vides engageants, jamais un « 0 » seul. Défile sur les petits écrans.
export default function ProfileScreen() {
  const { isLoading } = useApi();
  const session = useSession();
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const p = useProfile();
  // Défis de précision et meilleure série d'affilée (mémoire du téléphone)
  const accuracy = useAccuracy(p.userKey);
  const { launch } = useLessonLauncher();

  // Feuilles : montées pendant leur animation de fermeture
  const [objectiveMounted, setObjectiveMounted] = useState(false);
  const [objectiveOpen, setObjectiveOpen] = useState(false);
  const [streakMounted, setStreakMounted] = useState(false);
  const [streakOpen, setStreakOpen] = useState(false);
  const closeObjective = useCallback(() => setObjectiveOpen(false), []);
  const unmountObjective = useCallback(() => setObjectiveMounted(false), []);
  const closeStreak = useCallback(() => setStreakOpen(false), []);
  const unmountStreak = useCallback(() => setStreakMounted(false), []);

  const [notice, setNotice] = useState<string | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
  }, []);

  if (isLoading || !p.user) {
    return (
      <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
        <View style={styles.bar}>
          <BackButton onBack={() => router.back()} />
        </View>
        {session.profile === 'error' ? (
          // Profil introuvable (hors ligne, serveur en panne) : la cause,
          // « Réessayer », et les réglages restent ouverts (déconnexion)
          <View style={styles.stateWrap}>
            <LoadErrorState title="Profil indisponible" what="ton profil" kind={session.errorKind} onRetry={session.retryProfile} />
            <Button variant="secondary" label="Ouvrir les réglages" onPress={() => router.push('/client/reglages')} />
          </View>
        ) : session.profile === 'guest' ? (
          <PageState
            variant="empty"
            text="Ton profil, ta série et tes médailles apparaissent dès que tu te connectes."
            actionLabel="Se connecter"
            onAction={() => router.push('/client/login')}
          />
        ) : (
          <ProfileSkeleton />
        )}
      </SafeAreaView>
    );
  }

  const pickObjective = async (next: Objective) => {
    setObjectiveOpen(false);
    if (next === p.objective) return;
    const where = await p.changeObjective(next);
    setNotice(where === 'serveur' ? 'Objectif enregistré.' : 'Objectif enregistré sur ce téléphone.');
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), NOTICE_MS);
  };

  const openUniverse = (universeId: number) =>
    router.push({ pathname: '/apprendre/univers/[universeId]', params: { universeId } });

  const pseudo = p.user.pseudo ?? '';
  const tint = universeTint(p.objectiveSlug, p.universes);
  const next = p.progress.next;
  const medals = medalsEarned(p.best, p.streak);
  const lastMedal = lastMedalDays(p.best, p.streak);
  const declics = p.declics.length;
  const words = p.words;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.bar}>
        <BackButton onBack={() => router.back()} />
        <IconButton
          icon="settings-outline"
          variant="filled"
          onPress={() => router.push('/client/reglages')}
          accessibilityLabel="Réglages"
          accessibilityHint="Compte, préférences et données"
        />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* En-tête centré, sur une lueur dorée très douce */}
        <View style={styles.head}>
          <HeaderGlow top={GLOW_TOP} />
          <ProfileAvatar size={AVATAR} initial={initialOf(pseudo)} ratio={p.level.ratio} accessibilityLabel={levelA11y(p.level)} />
          <AppText maxFontSizeMultiplier={1.3} style={styles.pseudo} accessibilityRole="header" numberOfLines={1}>
            {pseudo}
          </AppText>
          <View style={[styles.pill, { backgroundColor: colors.goldPill }]} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
            <AppText maxFontSizeMultiplier={1.3} style={[styles.pillLevel, { color: colors.gold }]}>
              {`Niveau ${p.level.level}`}
            </AppText>
            <AppText variant="caption" tone="subtitle" maxFontSizeMultiplier={1.3}>
              {`· encore ${p.level.remaining} XP`}
            </AppText>
          </View>
        </View>

        <StatBand streak={p.streak} best={p.best} xp={p.xp} vals={p.vals} />

        <UniverseCard
          color={tint.face}
          label="Ton objectif"
          labelAction={
            <IconButton
              icon="pencil"
              iconSize={16}
              color={colors.subtitle}
              variant="plain"
              size={36}
              onPress={() => {
                setObjectiveMounted(true);
                setObjectiveOpen(true);
              }}
              accessibilityLabel="Changer d’objectif"
              accessibilityHint="Ouvre la liste des six objectifs"
              style={styles.pencil}
            />
          }
          title={p.objectiveLabel}
          done={p.progress.done}
          total={p.progress.total}
          emptyMessage={p.noLessons ? 'Les leçons de cet univers arrivent bientôt.' : null}
          next={
            next
              ? { title: next.lesson.title, onPress: () => launch(next.lesson), accessibilityLabel: `Prochaine leçon : ${next.lesson.title}` }
              : p.noLessons
                ? p.nearestUniverse
                  ? { title: `Univers ${p.nearestUniverse.name}`, onPress: () => openUniverse(p.nearestUniverse!.id), accessibilityLabel: `En attendant, l’univers ${p.nearestUniverse.name}` }
                  : {
                      title: `Leçon découverte : ${discoveryLesson(p.objective).title ?? ''}`,
                      onPress: () => router.push({ pathname: '/bienvenue/lecon', params: { objectif: p.objective, depuis: 'accueil' } }),
                    }
                : p.progress.universe && !p.finished
                ? { title: `Voir l’univers ${p.progress.universe.name}`, onPress: () => openUniverse(p.progress.universe!.id) }
                : null
          }
          finished={
            p.finished
              ? {
                  title: 'Univers terminé !',
                  link: p.nextUniverse
                    ? { label: `Univers suivant : ${p.nextUniverse.name}`, onPress: () => openUniverse(p.nextUniverse!.id) }
                    : undefined,
                }
              : null
          }
        />
        {notice ? (
          <AppText variant="caption" tone="success" accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.notice}>
            {notice}
          </AppText>
        ) : null}

        <WeekChart week={p.week} />

        <View style={styles.access}>
          <AccessTile
            icon={
              <IconSquare background={colors.goldTile}>
                <Ionicons name="sparkles" size={20} color={colors.gold} />
              </IconSquare>
            }
            value={declics > 0 ? String(declics) : undefined}
            unit={declics > 0 ? (declics > 1 ? 'déclics' : 'déclic') : undefined}
            caption={declics > 0 ? 'Ton carnet · me tester' : 'Ton carnet se remplit à chaque leçon'}
            onPress={() => router.push('/client/carnet')}
            accessibilityLabel={declics > 0 ? `Ton carnet : ${declics} ${declics > 1 ? 'déclics' : 'déclic'}` : 'Ton carnet, vide pour l’instant'}
            accessibilityHint="Ouvre ton carnet et le test sur tes déclics"
          />
          <MedalsCard
            medals={medals}
            lastMedal={lastMedal}
            accuracy={accuracy}
            onStreak={() => {
              setStreakMounted(true);
              setStreakOpen(true);
            }}
          />
          <PatrimoineStepsCard user={p.userKey} />
          <BudgetStepsCard user={p.userKey} />
          <AccessTile
            icon={
              <IconSquare background={withOpacity(colors.chart3, 0.18)}>
                <Ionicons name="book-outline" size={20} color={colors.chart3} />
              </IconSquare>
            }
            value={words.seen > 0 ? wordCountsLabel(words) : undefined}
            caption={words.seen > 0 ? (p.wordsTotal > 0 ? `sur ${p.wordsTotal} mots du Dictionnaire` : 'Mots du Dictionnaire') : 'Ouvre ton premier mot'}
            onPress={() => router.navigate({ pathname: '/dictionary', params: { section: 'mes-mots' } })}
            accessibilityLabel={
              words.seen > 0
                ? `Mots du Dictionnaire : ${wordCountsLabel(words)}${p.wordsTotal > 0 ? `, sur ${p.wordsTotal}` : ''}`
                : 'Aucun mot vu pour l’instant'
            }
            accessibilityHint="Ouvre le Dictionnaire"
          />
        </View>
      </ScrollView>

      {objectiveMounted ? (
        <ObjectiveSheet
          open={objectiveOpen}
          current={p.objective}
          universes={p.universes}
          onPick={pickObjective}
          onRequestClose={closeObjective}
          onClosed={unmountObjective}
        />
      ) : null}
      {streakMounted ? (
        <StreakSheet
          streak={p.streak}
          best={p.best}
          freezes={null}
          open={streakOpen}
          onRequestClose={closeStreak}
          onClosed={unmountStreak}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  stateWrap: {
    gap: space[2],
    paddingHorizontal: space[4],
  },
  screen: {
    flex: 1,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space[4],
    minHeight: 48,
  },
  content: {
    paddingHorizontal: space[5],
    paddingBottom: space[6],
    gap: space[3] + 2,
  },
  head: {
    alignItems: 'center',
    paddingTop: space[1],
  },
  pseudo: {
    fontFamily: fonts.title,
    fontSize: PSEUDO_SIZE,
    lineHeight: 32,
    letterSpacing: titleLetterSpacing(PSEUDO_SIZE),
    marginTop: space[3],
    textAlign: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 28,
    paddingHorizontal: space[3],
    marginTop: 6,
    borderRadius: radius.pill,
  },
  pillLevel: {
    fontFamily: fonts.bodyExtraBold,
    fontSize: 13,
    lineHeight: 18,
  },
  pencil: {
    marginVertical: -space[2],
    marginRight: -space[2],
  },
  notice: {
    marginTop: -space[1],
    textAlign: 'center',
  },
  access: {
    gap: space[2] + 2,
  },
});
