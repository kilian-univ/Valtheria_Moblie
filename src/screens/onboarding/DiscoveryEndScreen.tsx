import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AppText from '@/src/components/common/AppText';
import Button from '@/src/components/common/Button';
import { StatusBarShade } from '@/src/components/common/AppBackground';
import GoldConfetti from '@/src/components/common/GoldConfetti';
import ProgressDots from '@/src/components/common/ProgressDots';
import MedalCelebration from '@/src/components/common/MedalCelebration';
import { StaggerItem } from '@/src/components/common/Stagger';
import StreakFlame from '@/src/components/common/StreakFlame';
import ValFullBody from '@/src/components/common/ValFullBody';
import { palette, radius, space } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import LessonRecap from '@/src/components/apprendre/end/LessonRecap';
import { discoveryLesson, discoveryPlan, nextLessonTitle, toObjective, universeName } from '@/src/lesson/discovery';
import { learningStore } from '@/src/state/learningStore';
import { onboardingStore, useOnboarding } from '@/src/state/onboarding';
import { getReminderSettings } from '@/src/state/reminder';
import { useCountUp } from '@/src/hooks/useCountUp';
import {
  discoveryStreak,
  endActions,
  endTitle,
  remainingLabel,
  remainingTopics,
  topicDots,
} from '@/src/utils/discoveryHome';
import { celebrate } from '@/src/utils/haptics';
import { type Medal, MEDALS } from '@/src/utils/streakRewards';
import { isSignupClosed } from '@/src/utils/onboarding';

const VAL_HEIGHT = 170;
const LOCK = 44;
const PILL_FLAME = 24;
// Le nombre de jours défile une fois la flamme lancée
const COUNT_DELAY = 450;

// Fin de la leçon découverte : Val fier (« Bravo, <prénom> ! »), la série,
// la prochaine leçon (verrouillée tant qu'il n'y a pas de compte). Inscription
// ouverte : créer le compte ; fermée : « Me rappeler demain » (choix du
// rappel), ou « Plus tard » vers l'accueil. La leçon qui complète les six
// passe d'abord par la célébration (une seule fois).
export default function DiscoveryEndScreen() {
  const params = useLocalSearchParams<{
    six?: string;
    medaille?: string;
    gel?: string;
    justes?: string;
    total?: string;
    rattrapees?: string;
  }>();
  const medal = MEDALS.find((m) => String(m.days) === params.medaille) ?? null;
  // Dans l'ordre : le bilan de la leçon (s'il est transmis), les six sujets,
  // puis le palier de série
  const [steps, setSteps] = useState<('recap' | 'six' | 'medal')[]>(() =>
    [
      params.total !== undefined ? ('recap' as const) : null,
      params.six === '1' ? ('six' as const) : null,
      medal ? ('medal' as const) : null,
    ].filter((x) => x !== null)
  );
  const next = () => setSteps((list) => list.slice(1));
  if (steps[0] === 'recap') return <RecapStep onDone={next} />;
  if (steps[0] === 'six') return <SixCelebration onDone={next} />;
  if (steps[0] === 'medal' && medal) return <MedalStep medal={medal} freezeGained={params.gel === '1'} onDone={next} />;
  return <EndContent />;
}

// Palier de série atteint (une seule fois par palier) : la médaille, Val fier,
// confettis dorés. Animations réduites : sans confettis.
function MedalStep({ medal, freezeGained, onDone }: { medal: Medal; freezeGained: boolean; onDone: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.content, styles.celebration, { paddingTop: insets.top + space[8] }]} bounces={false}>
        <MedalCelebration medal={medal} freezeGained={freezeGained} />
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: insets.bottom + space[3] }]}>
        <Button label="Continuer" onPress={onDone} />
      </View>
      <GoldConfetti />
      <StatusBarShade tab="apprendre" />
    </View>
  );
}

// Bilan de la leçon découverte : justes (et rattrapées), série, la phrase à
// retenir (le déclic du document). Pas d'XP : rien n'est envoyé au serveur.
function RecapStep({ onDone }: { onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const { state } = useOnboarding();
  const params = useLocalSearchParams<{ objectif?: string; depuis?: string; justes?: string; total?: string; rattrapees?: string }>();
  const fromHome = params.depuis === 'accueil';
  const lesson = discoveryLesson((fromHome ? toObjective(params.objectif) : null) ?? state.objective);
  const count = (raw: string | undefined) => {
    const n = Number(raw);
    return Number.isInteger(n) && n >= 0 ? n : 0;
  };
  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <LessonRecap
        firstName={state.firstName}
        lessonTitle={lesson.title}
        xp={null}
        correct={count(params.justes)}
        total={count(params.total)}
        recovered={count(params.rattrapees)}
        streak={Math.max(1, discoveryStreak(state.lessonDays))}
        takeaway={lesson.takeaway}
        onContinue={onDone}
      />
      <StatusBarShade tab="apprendre" />
    </View>
  );
}

function EndContent() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const { state } = useOnboarding();
  // Jouée depuis l'accueil sans compte : la leçon de la tuile, retour à l'accueil
  const params = useLocalSearchParams<{ objectif?: string; depuis?: string; serie?: string }>();
  const fromHome = params.depuis === 'accueil';
  const plan = discoveryPlan((fromHome ? toObjective(params.objectif) : null) ?? state.objective);
  const closed = isSignupClosed(state.signupClosedAt);
  const streak = Math.max(1, discoveryStreak(state.lessonDays));
  // Série d'avant cette leçon : si elle a augmenté, la flamme grandit et le
  // nombre défile de l'ancien au nouveau total
  const before = Number(params.serie);
  const streakFrom = Number.isInteger(before) && before >= 0 && before < streak ? before : streak;
  const shownStreak = Math.round(useCountUp(streak, { from: streakFrom, delay: COUNT_DELAY }));
  const remaining = remainingTopics(state.played);
  // Rappel déjà actif : pas de « Me rappeler demain »
  const [reminderOn, setReminderOn] = useState(false);
  useEffect(() => {
    let active = true;
    getReminderSettings().then((r) => {
      if (active) setReminderOn(r.enabled);
    });
    return () => {
      active = false;
    };
  }, []);
  const actions = endActions(closed, reminderOn);
  // Sans compte, rien n'est chargé en général : la carte nomme alors l'univers
  const { modules, universes } = useSyncExternalStore(learningStore.subscribe, learningStore.getState);
  const nextTitle = nextLessonTitle(plan, universes, modules) ?? `Première leçon de l’univers ${universeName(plan, universes)}`;

  const signUp = () => {
    if (fromHome) {
      router.push('/client/register');
      return;
    }
    onboardingStore.update({ step: 'pseudo' });
    router.push('/bienvenue/inscription');
  };

  // « Plus tard » : l'accueil sans compte ; le parcours ne revient plus
  const later = () => {
    if (state.status === 'en-cours') onboardingStore.update({ status: 'plus-tard' });
    router.replace('/apprendre');
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + space[6] }]} bounces={false}>
        <ValFullBody pose="fier" height={VAL_HEIGHT} halo />
        <StaggerItem index={0}>
          <AppText variant="title1" accessibilityRole="header" style={styles.center}>
            {endTitle(state.firstName, state.played.length <= 1)}
          </AppText>
        </StaggerItem>
        <StaggerItem index={1}>
          <View
            style={[styles.streak, { backgroundColor: colors.goldSoft }]}
            accessible
            accessibilityLabel={streak === 1 ? 'Jour 1 : ta série commence' : `Jour ${streak} : ta série continue`}
          >
            <StreakFlame days={streak} size={PILL_FLAME} growFrom={streakFrom} />
            <AppText variant="bodyMedium" tone="gold" style={styles.tabular}>
              {streak === 1 ? 'Jour 1 : ta série commence' : `Jour ${shownStreak} : ta série continue`}
            </AppText>
          </View>
        </StaggerItem>
        {remaining > 0 ? (
          <StaggerItem index={2}>
            <View style={styles.topics} accessible accessibilityLabel={remainingLabel(remaining)}>
              <AppText variant="callout" tone="subtitle">
                {remainingLabel(remaining)}
              </AppText>
              <ProgressDots dots={topicDots(state.played)} doneColor={colors.gold} emptyBorder={colors.controlBorder} />
            </View>
          </StaggerItem>
        ) : null}
        <StaggerItem index={3}>
          <View
            style={[styles.next, { backgroundColor: colors.surface, borderColor: colors.controlBorder }]}
            accessible
            accessibilityLabel={`Prochaine leçon, verrouillée : ${nextTitle}`}
          >
            <View style={[styles.lock, { backgroundColor: colors.pathLockedFace }]}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.subtitle} />
            </View>
            <View style={styles.nextTexts}>
              <AppText variant="sectionLabel" tone="subtitle">
                Prochaine leçon
              </AppText>
              <AppText variant="bodyMedium">{nextTitle}</AppText>
            </View>
          </View>
        </StaggerItem>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + space[3] }]}>
        {/* Même règle que l'accueil : inscription fermée, pas de « Créer mon compte » */}
        {actions.kind === 'register' ? (
          <>
            <Button label="Créer mon compte pour continuer" onPress={signUp} />
            <AppText variant="caption" tone="subtitle" style={styles.center}>
              Gratuit. Ta série et ta progression sont gardées.
            </AppText>
            <Button variant="text" label={fromHome ? 'Retour à l’accueil' : 'Plus tard'} onPress={later} />
          </>
        ) : (
          <>
            <AppText variant="caption" tone="subtitle" style={styles.center}>
              Les inscriptions ouvrent très bientôt. Ta progression est gardée sur ton téléphone.
            </AppText>
            {actions.kind === 'reminder' ? (
              <>
                <Button label="Me rappeler demain" onPress={() => router.push('/bienvenue/rappel')} />
                <Button variant="text" label="Plus tard" onPress={later} />
              </>
            ) : (
              <Button label="Retour à l’accueil" onPress={later} />
            )}
          </>
        )}
      </View>
      {/* Rien ne passe sous la barre d'état en défilant */}
      <StatusBarShade tab="apprendre" />
    </View>
  );
}

// Fin de la sixième leçon découverte, quel que soit l'ordre : Val fier, gerbe
// de confettis dorés, vibration. Animations réduites : sans confettis.
function SixCelebration({ onDone }: { onDone: () => void }) {
  const insets = useSafeAreaInsets();

  useEffect(() => {
    celebrate();
  }, []);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.content, styles.celebration, { paddingTop: insets.top + space[8] }]} bounces={false}>
        <ValFullBody pose="fier" height={VAL_HEIGHT + 40} halo />
        <StaggerItem index={0}>
          <AppText variant="title1" accessibilityRole="header" style={styles.center}>
            Les six sujets, découverts !
          </AppText>
        </StaggerItem>
        <StaggerItem index={1}>
          <AppText variant="body" tone="subtitle" style={styles.center}>
            Tu en sais déjà plus que beaucoup de monde sur l’argent.
          </AppText>
        </StaggerItem>
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: insets.bottom + space[3] }]}>
        <Button label="Continuer" onPress={onDone} />
      </View>
      <GoldConfetti />
      <StatusBarShade tab="apprendre" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  celebration: {
    justifyContent: 'center',
  },
  tabular: {
    fontVariant: ['tabular-nums'],
  },
  topics: {
    alignItems: 'center',
    gap: space[2],
  },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: space[5],
    gap: space[4],
  },
  center: {
    textAlign: 'center',
  },
  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    minHeight: 38,
    paddingHorizontal: space[4] - 2,
    borderRadius: radius.pill,
  },
  next: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[4] - 2,
    padding: space[4] - 2,
    borderRadius: radius.card,
    borderWidth: 1,
    marginTop: space[2],
  },
  lock: {
    width: LOCK,
    height: LOCK,
    borderRadius: LOCK / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextTexts: {
    flex: 1,
    gap: 2,
  },
  footer: {
    paddingHorizontal: space[5],
    paddingTop: space[3],
    gap: space[2],
  },
});
