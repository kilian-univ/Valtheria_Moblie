import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import StreakSheet from '@/src/components/apprendre/home/StreakSheet';
import AppText from '@/src/components/common/AppText';
import BackButton from '@/src/components/common/BackButton';
import IconButton from '@/src/components/common/IconButton';
import { ProfileSkeleton } from '@/src/components/common/ScreenSkeletons';
import NotebookCard from '@/src/components/profile/NotebookCard';
import ObjectiveCard from '@/src/components/profile/ObjectiveCard';
import ObjectiveSheet from '@/src/components/profile/ObjectiveSheet';
import ProfileAvatar from '@/src/components/profile/ProfileAvatar';
import RingTile from '@/src/components/profile/RingTile';
import StatBand from '@/src/components/profile/StatBand';
import { fonts, palette, space, titleLetterSpacing } from '@/src/constants/style/Style';
import { useApi } from '@/src/context/ApiContext';
import { useTheme } from '@/src/context/ThemeContext';
import { useLessonLauncher } from '@/src/hooks/useLessonLauncher';
import { useProfile } from '@/src/hooks/useProfile';
import type { Objective } from '@/src/lesson/discovery';
import { shortQuote } from '@/src/utils/notebook';
import { initialOf, levelA11y, medalsEarned } from '@/src/utils/profile';
import { MEDALS } from '@/src/utils/streakRewards';
import { universeTint } from '@/src/utils/universeTint';

const AVATAR = 76;
const PSEUDO_SIZE = 26;
// Petit message après un changement d'objectif
const NOTICE_MS = 2600;

// Profil (écran poussé, fond commun) : l'en-tête compact (photo et anneau de
// niveau, pseudo, niveau), la bande de chiffres, la carte de l'objectif, le
// carnet de déclics, puis les médailles et les mots découverts. La roue
// dentée ouvre les Réglages. Tient sur un écran d'iPhone standard ; sur
// iPhone SE et en grand texte, l'écran défile.
export default function ProfileScreen() {
  const { isLoading } = useApi();
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const p = useProfile();
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
        <ProfileSkeleton />
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

  // Prochaine leçon disponible de l'univers, sinon la page de l'univers
  const continueObjective = () => {
    if (p.progress.next) launch(p.progress.next.lesson);
    else if (p.progress.universe)
      router.push({ pathname: '/apprendre/univers/[universeId]', params: { universeId: p.progress.universe.id } });
    else router.navigate('/apprendre');
  };

  const latest = p.declics[0] ? shortQuote(p.declics[0].text) : null;
  const medals = medalsEarned(p.best, p.streak);
  const pseudo = p.user.pseudo ?? '';

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
        {/* En-tête compact */}
        <View style={styles.head}>
          <ProfileAvatar size={AVATAR} initial={initialOf(pseudo)} ratio={p.level.ratio} accessibilityLabel={levelA11y(p.level)} />
          <View style={styles.headTexts}>
            <AppText maxFontSizeMultiplier={1.3} style={styles.pseudo} accessibilityRole="header" numberOfLines={1}>
              {pseudo}
            </AppText>
            <AppText variant="caption" tone="subtitle" maxFontSizeMultiplier={1.4} importantForAccessibility="no" accessibilityElementsHidden>
              <AppText variant="caption" style={[styles.level, { color: colors.gold }]}>
                {`Niveau ${p.level.level}`}
              </AppText>
              {` · encore ${p.level.remaining} XP`}
            </AppText>
          </View>
        </View>

        <StatBand streak={p.streak} best={p.best} xp={p.xp} vals={p.vals} />

        <ObjectiveCard
          label={p.objectiveLabel}
          tint={universeTint(p.objectiveSlug, p.universes)}
          done={p.progress.done}
          total={p.progress.total}
          onEdit={() => {
            setObjectiveMounted(true);
            setObjectiveOpen(true);
          }}
          onContinue={continueObjective}
        />
        {notice ? (
          <AppText variant="caption" tone="success" accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.notice}>
            {notice}
          </AppText>
        ) : null}

        <NotebookCard count={p.declics.length} latest={latest} onPress={() => router.push('/client/carnet')} />

        <View style={styles.rings}>
          <RingTile
            value={`${medals}/${MEDALS.length}`}
            ratio={medals / MEDALS.length}
            title="Médailles"
            caption="de série"
            accessibilityLabel={`Médailles de série : ${medals} sur ${MEDALS.length}`}
            accessibilityHint="Ouvre ta série et tes médailles"
            onPress={() => {
              setStreakMounted(true);
              setStreakOpen(true);
            }}
          />
          <RingTile
            value={String(p.wordsDiscovered)}
            ratio={p.wordsTotal > 0 ? p.wordsDiscovered / p.wordsTotal : 0}
            title="Mots"
            caption={p.wordsTotal > 0 ? `sur ${p.wordsTotal} découverts` : 'découverts'}
            color={colors.chart3}
            accessibilityLabel={
              p.wordsTotal > 0
                ? `Mots découverts : ${p.wordsDiscovered} sur ${p.wordsTotal}`
                : `Mots découverts : ${p.wordsDiscovered}`
            }
            accessibilityHint="Ouvre Mes mots dans le Dictionnaire"
            onPress={() => router.navigate({ pathname: '/dictionary', params: { section: 'mes-mots' } })}
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
    paddingTop: space[1],
    paddingBottom: space[6],
    gap: space[4],
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3] + 2,
  },
  headTexts: {
    flex: 1,
  },
  pseudo: {
    fontFamily: fonts.title,
    fontSize: PSEUDO_SIZE,
    lineHeight: 30,
    letterSpacing: titleLetterSpacing(PSEUDO_SIZE),
  },
  level: {
    fontFamily: fonts.bodyBold,
  },
  notice: {
    marginTop: -space[2],
    textAlign: 'center',
  },
  rings: {
    flexDirection: 'row',
    gap: space[2] + 2,
    marginTop: -space[1],
  },
});
