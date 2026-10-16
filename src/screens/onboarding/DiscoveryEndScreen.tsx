import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ComponentProps, useEffect, useState, useSyncExternalStore } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AppText from '@/src/components/common/AppText';
import Button from '@/src/components/common/Button';
import { StatusBarShade } from '@/src/components/common/AppBackground';
import GoldConfetti from '@/src/components/common/GoldConfetti';
import GoldHalo from '@/src/components/common/GoldHalo';
import ChallengeCelebration from '@/src/components/common/ChallengeCelebration';
import MedalCelebration from '@/src/components/common/MedalCelebration';
import { StaggerItem } from '@/src/components/common/Stagger';
import StreakFlame from '@/src/components/common/StreakFlame';
import UniverseArt from '@/src/components/common/UniverseArt';
import UniverseCard from '@/src/components/common/UniverseCard';
import ValFullBody from '@/src/components/common/ValFullBody';
import { motion, springs } from '@/src/constants/motion';
import { fonts, palette, radius, space, withOpacity } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import LessonRecap from '@/src/components/apprendre/end/LessonRecap';
import { useApi } from '@/src/context/ApiContext';
import { celebrationName, streakDaysCaption } from '@/src/utils/lessonPlayer';
import {
  DISCOVERY,
  discoveryLesson,
  discoveryPlan,
  OBJECTIVE_OPTIONS,
  toObjective,
  universeName,
} from '@/src/lesson/discovery';
import { learningStore } from '@/src/state/learningStore';
import { onboardingStore, useOnboarding } from '@/src/state/onboarding';
import { getReminderSettings } from '@/src/state/reminder';
import { useCountTicks } from '@/src/hooks/useCountTicks';
import { useCountUp } from '@/src/hooks/useCountUp';
import { discoveryStreak, endActions, topicDots } from '@/src/utils/discoveryHome';
import { REFERENCE_SCREEN_HEIGHT } from '@/src/utils/fit';
import { formatInteger } from '@/src/utils/format';
import { feedback } from '@/src/utils/feedback';
import { celebrate } from '@/src/utils/haptics';
import { preloadSounds } from '@/src/utils/sound';
import { type Medal, MEDALS, weekDays, type WeekDay } from '@/src/utils/streakRewards';
import { isSignupClosed } from '@/src/utils/onboarding';
import { type Challenge, findChallenge } from '@/src/utils/accuracy';
import { universeTint } from '@/src/utils/universeTint';

type IconName = ComponentProps<typeof Ionicons>['name'];

const VAL_HEIGHT = 170;
// Grosse flamme de la série, sous une lueur orange ; plus petite sur un
// écran bas (iPhone SE), avec le nombre de jours et des espacements plus
// serrés : tout tient sans défiler, les boutons ne recouvrent rien
const FLAME_BOX = 200;
const FLAME_BOX_SHORT = 120;
const DAYS_SIZE_SHORT = 52;
const FLAME_SHARE = 0.75;
const DAYS_SIZE = 64;
const DAY_DOT = 30;
const TOPIC = 44;
const SUITE_ART = 56;
const SUITE_TITLE = 18;
const QUIET_DAY = 0.6;
// Le nombre défile une fois la flamme allumée
const FLAME_LIT = 450;

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
    defis?: string;
  }>();
  const medal = MEDALS.find((m) => String(m.days) === params.medaille) ?? null;
  // Défis de précision gagnés par cette leçon
  const challenges = (params.defis ?? '')
    .split(',')
    .map(findChallenge)
    .filter((c): c is Challenge => c !== null);
  // Dans l'ordre : le bilan de la leçon (s'il est transmis), les six sujets,
  // le palier de série, puis les défis de précision
  const [steps, setSteps] = useState<string[]>(() =>
    [
      params.total !== undefined ? 'recap' : null,
      params.six === '1' ? 'six' : null,
      medal ? 'medal' : null,
      ...challenges.map((c) => `defi:${c.id}`),
    ].filter((x): x is string => x !== null)
  );
  const next = () => setSteps((list) => list.slice(1));
  // Sons préchargés à l'ouverture de la cérémonie de fin
  useEffect(() => {
    preloadSounds();
  }, []);
  if (steps[0] === 'recap') return <RecapStep onDone={next} />;
  if (steps[0] === 'six') return <SixCelebration onDone={next} />;
  if (steps[0] === 'medal' && medal) return <MedalStep medal={medal} freezeGained={params.gel === '1'} onDone={next} />;
  const challenge = steps[0]?.startsWith('defi:') ? findChallenge(steps[0].slice(5)) : null;
  if (challenge) return <ChallengeStep key={challenge.id} challenge={challenge} onDone={next} />;
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

// Défi de précision gagné : même écran que la médaille de série
function ChallengeStep({ challenge, onDone }: { challenge: Challenge; onDone: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.content, styles.celebration, { paddingTop: insets.top + space[8] }]} bounces={false}>
        <ChallengeCelebration challenge={challenge} />
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: insets.bottom + space[3] }]}>
        <Button label="Continuer" onPress={onDone} />
      </View>
      <GoldConfetti />
      <StatusBarShade tab="apprendre" />
    </View>
  );
}

// Bilan de la leçon découverte : XP comptés sur le téléphone (20 la première
// fois, 0 en la rejouant), justes (et rattrapées), série, la phrase à
// retenir (le déclic du document)
function RecapStep({ onDone }: { onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const { state } = useOnboarding();
  const { user } = useApi();
  const params = useLocalSearchParams<{
    objectif?: string;
    depuis?: string;
    justes?: string;
    total?: string;
    rattrapees?: string;
    xp?: string;
    meilleure?: string;
    parfaite?: string;
  }>();
  const fromHome = params.depuis === 'accueil';
  const lesson = discoveryLesson((fromHome ? toObjective(params.objectif) : null) ?? state.objective);
  const count = (raw: string | undefined) => {
    const n = Number(raw);
    return Number.isInteger(n) && n >= 0 ? n : 0;
  };
  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <LessonRecap
        firstName={celebrationName(user?.pseudo, state.firstName)}
        lessonTitle={lesson.title}
        xp={count(params.xp)}
        correct={count(params.justes)}
        total={count(params.total)}
        recovered={count(params.rattrapees)}
        streak={Math.max(1, discoveryStreak(state.lessonDays))}
        takeaway={lesson.takeaway}
        bestRun={count(params.meilleure)}
        perfect={params.parfaite === '1'}
        onContinue={onDone}
      />
      <StatusBarShade tab="apprendre" />
    </View>
  );
}

// Série et suite, sans compte (dernier écran de la leçon découverte) : la
// grosse flamme qui s'allume puis grossit, le nombre de jours qui défile, la
// semaine (le jour s'allume), les six sujets en médaillons, la suite dans
// l'univers conseillé. Inscription ouverte : « Garder ma série » ; fermée :
// « Me rappeler demain » (ou l'accueil si le rappel est déjà réglé).
function EndContent() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const reduced = useReducedMotion();
  const { height } = useWindowDimensions();
  const short = height < REFERENCE_SCREEN_HEIGHT;
  const flameBox = short ? FLAME_BOX_SHORT : FLAME_BOX;
  const { state } = useOnboarding();
  const params = useLocalSearchParams<{ objectif?: string; depuis?: string; serie?: string }>();
  const fromHome = params.depuis === 'accueil';
  const plan = discoveryPlan((fromHome ? toObjective(params.objectif) : null) ?? state.objective);
  const closed = isSignupClosed(state.signupClosedAt);
  const streak = Math.max(1, discoveryStreak(state.lessonDays));
  const before = Number(params.serie);
  const streakFrom = Number.isInteger(before) && before >= 0 && before < streak ? before : streak;
  const shownStreak = Math.round(useCountUp(streak, { from: streakFrom, delay: FLAME_LIT }));
  // Les jours qui défilent : un cran aigu, comme au bilan
  useCountTicks(shownStreak, streakFrom);
  const week = weekDays(state.lessonDays);
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
  useEffect(() => {
    celebrate();
    // La série augmente : la flamme grandit, avec son son
    if (streakFrom < streak) feedback.streakUp();
    // Une seule fois, à l'arrivée
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const actions = endActions(closed, reminderOn);
  const { universes } = useSyncExternalStore(learningStore.subscribe, learningStore.getState);
  const suite = universeName(plan, universes);
  const suiteTint = universeTint(plan.universe.slug, universes);

  // Le jour s'allume une fois le nombre posé
  const todayLit = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (reduced) return;
    todayLit.set(withDelay(FLAME_LIT + motion.roll, withSpring(1, springs.celebrate)));
  }, [reduced, todayLit]);
  const todayStyle = useAnimatedStyle(() => ({ transform: [{ scale: 0.6 + 0.4 * todayLit.get() }], opacity: todayLit.get() }));

  const signUp = () => {
    if (fromHome) {
      router.push('/client/register');
      return;
    }
    onboardingStore.update({ step: 'pseudo' });
    router.push('/bienvenue/inscription');
  };

  const later = () => {
    if (state.status === 'en-cours') onboardingStore.update({ status: 'plus-tard' });
    router.replace('/apprendre');
  };

  const played = topicDots(state.played).filter(Boolean).length;

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.content, short && styles.contentShort, { paddingTop: insets.top + (short ? space[2] : space[4]) }]}
        bounces={false}
      >
        {/* La flamme et le nombre de jours */}
        <View style={styles.flameBlock} accessible accessibilityLabel={`${streak} ${streakDaysCaption(streak)}`}>
          <View
            style={[styles.flameBox, { width: flameBox, height: flameBox }]}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            <GoldHalo color={colors.streakGlow} />
            <StreakFlame days={streak} size={Math.round(flameBox * FLAME_SHARE)} ignite growFrom={streakFrom} />
          </View>
          <AppText maxFontSizeMultiplier={1.2} style={[styles.days, short && styles.daysShort]}>
            {formatInteger(shownStreak)}
          </AppText>
          <AppText style={[styles.daysLabel, { color: colors.streak }]}>{streakDaysCaption(streak)}</AppText>
        </View>

        {/* La semaine : jours de série, aujourd'hui entouré d'or */}
        <View style={styles.week} accessible accessibilityLabel={weekA11y(week)}>
          {week.map((d, i) => {
            const done = d.state === 'done';
            const dot = (
              <View
                style={[
                  styles.dayDot,
                  done
                    ? { backgroundColor: colors.streakGlow, borderColor: colors.streak, borderWidth: 2 }
                    : { borderColor: colors.controlBorder, borderWidth: 1, opacity: QUIET_DAY },
                  d.isToday && { borderColor: colors.gold, borderWidth: 2, opacity: 1 },
                ]}
              >
                {done ? (
                  <AppText allowFontScaling={false} style={styles.dayFlame}>
                    🔥
                  </AppText>
                ) : null}
              </View>
            );
            return (
              <View key={i} style={styles.day}>
                {d.isToday && done ? <Animated.View style={todayStyle}>{dot}</Animated.View> : dot}
                <AppText variant="caption" style={[styles.dayLetter, { color: d.isToday ? colors.gold : colors.subtitle }]}>
                  {d.letter}
                </AppText>
              </View>
            );
          })}
        </View>

        {/* Les six sujets */}
        <View style={[styles.card, { backgroundColor: colors.panel }]} accessible accessibilityLabel={`Sujets découverts : ${played} sur 6`}>
          <View style={styles.cardHead}>
            <AppText style={[styles.kicker, { color: colors.gold }]}>SUJETS DÉCOUVERTS</AppText>
            <AppText style={styles.count}>{`${played} sur 6`}</AppText>
          </View>
          <View style={styles.topics}>
            {OBJECTIVE_OPTIONS.map((o) => {
              const done = state.played.includes(o.value);
              const tint = universeTint(DISCOVERY[o.value].universe.slug, universes);
              return (
                <View
                  key={o.value}
                  style={[
                    styles.topic,
                    done
                      ? { backgroundColor: tint.face, boxShadow: [{ offsetX: 0, offsetY: 4, blurRadius: 0, color: withOpacity(colors.groundShadow, 0.35) }] }
                      : { borderColor: colors.controlBorder, borderWidth: 2, borderStyle: 'dashed' },
                  ]}
                >
                  <Ionicons name={o.icon as IconName} size={20} color={done ? tint.onFace : colors.subtitle} />
                  {done ? (
                    <View style={[styles.topicCheck, { backgroundColor: colors.gold, borderColor: colors.background }]}>
                      <Ionicons name="checkmark" size={10} color={colors.onGold} />
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        </View>

        {/* La suite : l'univers conseillé, verrouillé sans compte */}
        <View accessible accessibilityLabel={`La suite : univers ${suite}. Des vraies leçons t’y attendent. Verrouillé.`}>
          <UniverseCard
            color={suiteTint.face}
            label={`La suite : univers ${suite}`}
            labelAction={<Ionicons name="lock-closed-outline" size={18} color={colors.subtitle} />}
            title="Des vraies leçons t’y attendent"
            titleSize={SUITE_TITLE}
            done={0}
            total={1}
            showProgress={false}
            leading={<UniverseArt slug={plan.universe.slug} color={suiteTint.face} size={SUITE_ART} framed />}
          />
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + space[2] }]}>
        {/* Même règle que l'accueil : inscription fermée, pas de compte à créer */}
        {actions.kind === 'register' ? (
          <>
            <Button label="Garder ma série" onPress={signUp} />
            <AppText variant="caption" tone="subtitle" style={styles.center}>
              Crée ton compte gratuitement pour la garder.
            </AppText>
          </>
        ) : actions.kind === 'reminder' ? (
          <Button label="Me rappeler demain" onPress={() => router.push('/bienvenue/rappel')} />
        ) : (
          <Button label="Retour à l’accueil" onPress={later} />
        )}
        {actions.kind !== 'home' ? <Button variant="text" label="Plus tard" onPress={later} /> : null}
      </View>
      {/* Rien ne passe sous la barre d'état en défilant */}
      <StatusBarShade tab="apprendre" />
    </View>
  );
}

// « Cette semaine : lundi, série ; mardi… »
function weekA11y(week: WeekDay[]): string {
  const done = week.filter((d) => d.state === 'done').map((d) => d.name);
  return done.length > 0 ? `Cette semaine, jours de série : ${done.join(', ')}` : 'Cette semaine, aucun jour de série pour l’instant';
}

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
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: space[5],
    paddingBottom: space[4],
    gap: space[4],
  },
  center: {
    textAlign: 'center',
  },
  flameBlock: {
    alignItems: 'center',
  },
  // Écran bas : espacements resserrés
  contentShort: {
    gap: space[3],
    paddingBottom: space[2],
  },
  daysShort: {
    fontSize: DAYS_SIZE_SHORT,
    lineHeight: DAYS_SIZE_SHORT + 4,
  },
  flameBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  days: {
    fontFamily: fonts.title,
    fontSize: DAYS_SIZE,
    lineHeight: DAYS_SIZE + 4,
    fontVariant: ['tabular-nums'],
    marginTop: -space[2],
  },
  daysLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 17,
    lineHeight: 22,
  },
  week: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: space[2],
  },
  day: {
    alignItems: 'center',
    gap: space[1] + 2,
  },
  dayDot: {
    width: DAY_DOT,
    height: DAY_DOT,
    borderRadius: DAY_DOT / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayFlame: {
    fontSize: 13,
    lineHeight: 17,
  },
  dayLetter: {
    fontFamily: fonts.bodySemibold,
  },
  card: {
    gap: space[3],
    paddingVertical: space[3] + 2,
    paddingHorizontal: space[4],
    borderRadius: radius.card,
    borderCurve: 'continuous',
  },
  cardHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  kicker: {
    fontFamily: fonts.bodyExtraBold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.3,
  },
  count: {
    fontFamily: fonts.title,
    fontSize: 18,
    lineHeight: 24,
  },
  topics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  topic: {
    width: TOPIC,
    height: TOPIC,
    borderRadius: TOPIC / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topicCheck: {
    position: 'absolute',
    right: -4,
    top: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    paddingHorizontal: space[5],
    paddingTop: space[3],
    gap: space[1],
  },
});
