import { ReactNode, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppText from '@/src/components/common/AppText';
import Button from '@/src/components/common/Button';
import Stagger from '@/src/components/common/Stagger';
import ChestReveal from './ChestReveal';
import LessonRecap from './LessonRecap';
import ValFullBody, { ValFitContext } from '@/src/components/common/ValFullBody';
import { durations, springs } from '@/src/constants/motion';
import { fonts, space, titleLetterSpacing } from '@/src/constants/style/Style';
import { useCountTicks } from '@/src/hooks/useCountTicks';
import { useCountUp } from '@/src/hooks/useCountUp';
import { formatInteger } from '@/src/utils/format';
import { nextExcess } from '@/src/utils/fit';
import GoldConfetti from '@/src/components/common/GoldConfetti';
import MedalCelebration from '@/src/components/common/MedalCelebration';
import StreakFlame from '@/src/components/common/StreakFlame';
import { useApi } from '@/src/context/ApiContext';
import { useOnboarding } from '@/src/state/onboarding';
import { feedback } from '@/src/utils/feedback';
import { preloadSounds } from '@/src/utils/sound';
import { streakRewardsStore } from '@/src/state/streakRewards';
import { type Medal, medalToCelebrate } from '@/src/utils/streakRewards';
import {
  endSteps,
  EndStep,
  LessonResult,
  LessonSummary,
  celebrationName,
  chestAmount,
  chestRarity,
  streakDaysLabel,
  streakGain,
} from '@/src/utils/lessonPlayer';

// Étapes affichées : celles du serveur, plus la médaille si un palier est franchi
type FlowStep = EndStep | 'medal';

const TITLE_SIZE = 32;
const TITLE_LINE_HEIGHT = 38;
const STREAK_TITLE_SIZE = 26;
const STREAK_TITLE_LINE_HEIGHT = 32;
const STREAK_NUMBER_SIZE = 88;
const STREAK_NUMBER_LINE_HEIGHT = 96;
const FIRE_SIZE = 120;
// Carré de la flamme vivante : emoji de 120 au palier le plus haut
const FIRE_FLAME_BOX = FIRE_SIZE / 0.8;
const FIRE_FROM_SCALE = 0.3;
// Val en pied (saut, fier) : réduit sur petit écran, 160 au minimum
const VAL_FULL_HEIGHT = 260;
// Les chiffres défilent l'un après l'autre, une fois l'écran apparu
const COUNT_START = durations.enterOpacity;

type LessonEndFlowProps = {
  result: LessonResult;
  // Bilan compté par l'app (questions rattrapées comprises)
  summary: LessonSummary;
  lessonTitle: string | null;
  takeaway: string | null;
  // Série de jours avant la leçon (null : inconnue)
  streakBefore: number | null;
  moduleTitle: string | null;
  // Dernier bouton : retour là d'où l'on vient
  onDone: () => void;
  // Fin d'une révision (du serveur) : « RÉVISION TERMINÉE »
  revision?: boolean;
};

// Suite d'écrans de fin, en sautant ceux qui ne s'appliquent pas.
export default function LessonEndFlow({
  result,
  summary,
  lessonTitle,
  takeaway,
  streakBefore,
  moduleTitle,
  onDone,
  revision = false,
}: LessonEndFlowProps) {
  const { user } = useApi();
  const [baseSteps] = useState<EndStep[]>(() => endSteps(result, streakBefore));
  // Sons préchargés à l'ouverture de la cérémonie de fin
  useEffect(() => {
    preloadSounds();
  }, []);
  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);
  const gain = streakGain(streakBefore, result.user?.streak);

  // Palier de série franchi par cette leçon et jamais fêté (mémoire par
  // utilisateur) : l'écran de la médaille s'insère après celui de la série
  const [medal, setMedal] = useState<Medal | null>(null);
  const streakIndex = baseSteps.indexOf('streak');
  useEffect(() => {
    if (!user || !gain) return;
    let active = true;
    streakRewardsStore.load(user.id).then((record) => {
      const found = medalToCelebrate(gain.from, gain.to, record.celebrated);
      streakRewardsStore.seeStreak(user.id, gain.to);
      // Trop tard pour l'insérer (écran de série déjà passé) : fêté la prochaine fois
      if (!active || !found.medal || indexRef.current > streakIndex) return;
      streakRewardsStore.markCelebrated(user.id, found.crossed);
      setMedal(found.medal);
    });
    return () => {
      active = false;
    };
    // Une seule fois, à l'arrivée sur la fin de leçon
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const steps: FlowStep[] = medal ? [...baseSteps.slice(0, streakIndex + 1), 'medal', ...baseSteps.slice(streakIndex + 1)] : baseSteps;

  const next = () => {
    if (index < steps.length - 1) {
      indexRef.current = index + 1;
      setIndex(index + 1);
    } else onDone();
  };

  const step = steps[index];

  return (
    <EndLayout key={step}>
      {step === 'done' ? (
        <DoneStep
          result={result}
          summary={summary}
          lessonTitle={lessonTitle}
          takeaway={takeaway}
          kicker={revision ? 'RÉVISION TERMINÉE' : undefined}
          onNext={next}
        />
      ) : null}
      {step === 'streak' && gain ? <StreakStep from={gain.from} to={gain.to} onNext={next} /> : null}
      {step === 'medal' && medal ? <MedalStep medal={medal} onNext={next} /> : null}
      {step === 'chest' ? <ChestStep result={result} onNext={next} /> : null}
      {step === 'surprise' ? <ChestStep result={result} surprise onNext={next} /> : null}
      {step === 'module' ? <ModuleStep title={moduleTitle} onNext={next} /> : null}
    </EndLayout>
  );
}

function EndLayout({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      {children}
    </SafeAreaView>
  );
}

// Haut centré + bouton en bas. Si la place manque (petit écran), Val en
// pied se réduit (jusqu'à 160) ; au-delà, le contenu défile : le texte et le
// bouton ne sont jamais coupés.
function StepFrame({ children, button }: { children: ReactNode; button: ReactNode }) {
  const [available, setAvailable] = useState(0);
  const [excess, setExcess] = useState(0);

  return (
    <>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        onLayout={(e) => setAvailable(e.nativeEvent.layout.height)}
        showsVerticalScrollIndicator={false}
      >
        <View
          onLayout={(e) => {
            // Hauteur lue tout de suite : l'événement n'est pas gardé pour plus tard
            const content = e.nativeEvent.layout.height;
            if (available > 0) setExcess((x) => nextExcess(x, content, available));
          }}
        >
          <ValFitContext.Provider value={excess}>
            <Stagger style={styles.center}>{children}</Stagger>
          </ValFitContext.Provider>
        </View>
      </ScrollView>
      <View style={styles.footer}>{button}</View>
    </>
  );
}

function Title({ children }: { children: string }) {
  return (
    <AppText accessibilityRole="header" maxFontSizeMultiplier={1.3} style={styles.title}>
      {children}
    </AppText>
  );
}

// ---------------------------------------------------------------------------
// a. Bilan de la leçon
// ---------------------------------------------------------------------------
function DoneStep({
  result,
  summary,
  lessonTitle,
  takeaway,
  kicker,
  onNext,
}: {
  result: LessonResult;
  summary: LessonSummary;
  lessonTitle: string | null;
  takeaway: string | null;
  kicker?: string;
  onNext: () => void;
}) {
  const { state } = useOnboarding();
  const { user } = useApi();
  // Justes : le compte du serveur s'il est donné, sinon celui de l'app
  const serverCount = typeof result.first_try_correct === 'number' && typeof result.scored_total === 'number';
  return (
    <LessonRecap
      firstName={celebrationName(user?.pseudo, state.firstName)}
      lessonTitle={lessonTitle}
      xp={typeof result.xp_gained === 'number' ? result.xp_gained : null}
      correct={serverCount ? (result.first_try_correct as number) : summary.correct}
      total={serverCount ? (result.scored_total as number) : summary.total}
      recovered={summary.recovered}
      streak={typeof result.user?.streak === 'number' ? result.user.streak : null}
      takeaway={takeaway}
      kicker={kicker}
      onContinue={onNext}
    />
  );
}

// ---------------------------------------------------------------------------
// b. Série augmentée
// ---------------------------------------------------------------------------
function StreakStep({ from, to, onNext }: { from: number; to: number; onNext: () => void }) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(reduced ? 1 : FIRE_FROM_SCALE);
  const shown = Math.round(useCountUp(to, { from, delay: COUNT_START }));
  // Les jours qui défilent : un cran aigu, comme au bilan
  useCountTicks(shown, from);

  useEffect(() => {
    // La série augmente : la flamme grandit, avec son son
    feedback.streakUp();
    if (!reduced) scale.set(withSpring(1, springs.celebrate));
  }, [reduced, scale]);

  const fireStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  return (
    <StepFrame button={<Button label="On continue" onPress={onNext} />}>
      <Animated.View style={[styles.centered, fireStyle]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {/* Flamme vivante : elle grossit, lance ses étincelles et vibre */}
        <StreakFlame days={to} size={FIRE_FLAME_BOX} growFrom={from} />
      </Animated.View>

      <View style={styles.texts} accessible accessibilityLabel={`${to} ${streakDaysLabel(to)}`}>
        <AppText tone="gold" maxFontSizeMultiplier={1.2} style={styles.streakNumber}>
          {formatInteger(shown)}
        </AppText>
        <AppText maxFontSizeMultiplier={1.3} style={styles.streakTitle}>
          {streakDaysLabel(to)}
        </AppText>
      </View>

      <AppText variant="body" tone="subtitle" style={styles.centerText}>
        Reviens demain pour passer à {formatInteger(to + 1)}.
      </AppText>
    </StepFrame>
  );
}

// ---------------------------------------------------------------------------
// b bis. Nouvelle médaille de série (une seule fois par palier)
// ---------------------------------------------------------------------------
function MedalStep({ medal, onNext }: { medal: Medal; onNext: () => void }) {
  return (
    <>
      <StepFrame button={<Button label="Continuer" onPress={onNext} />}>
        <MedalCelebration medal={medal} />
      </StepFrame>
      <GoldConfetti />
    </>
  );
}

// ---------------------------------------------------------------------------
// c. Coffre, et c bis. coffre surprise (bonus occasionnel du serveur)
// ---------------------------------------------------------------------------
function ChestStep({ result, surprise, onNext }: { result: LessonResult; surprise?: boolean; onNext: () => void }) {
  const { state } = useOnboarding();
  const { user } = useApi();
  // Total des Vals : sur le dernier coffre seulement (le surprise suit le
  // coffre quand il y en a un)
  const last = surprise || chestAmount(result.surprise_chest) === 0;
  const total = last && typeof result.user?.vals === 'number' ? result.user.vals : null;
  return (
    <ChestReveal
      rarity={surprise ? 'legendaire' : chestRarity(result.chest?.rarity)}
      amount={chestAmount(surprise ? result.surprise_chest : result.chest)}
      total={total}
      firstName={celebrationName(user?.pseudo, state.firstName)}
      surprise={surprise}
      onDone={onNext}
    />
  );
}

// ---------------------------------------------------------------------------
// d. Module terminé
// ---------------------------------------------------------------------------
function ModuleStep({ title, onNext }: { title: string | null; onNext: () => void }) {
  useEffect(() => {
    feedback.moduleComplete();
  }, []);
  return (
    <StepFrame button={<Button label="Voir la suite" onPress={onNext} />}>
      <ValFullBody pose="fier" height={VAL_FULL_HEIGHT} />
      <View style={styles.texts}>
        <Title>Module terminé !</Title>
        {title ? (
          <AppText variant="body" tone="subtitle" style={styles.centerText}>
            {title}
          </AppText>
        ) : null}
      </View>
    </StepFrame>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: space[4],
  },
  center: {
    // Chaque élément se centre lui-même : la rangée de chiffres prend toute la largeur
    alignItems: 'stretch',
    gap: space[6],
    paddingHorizontal: space[5],
  },
  footer: {
    paddingHorizontal: space[5],
    paddingBottom: space[4],
  },
  texts: {
    alignItems: 'center',
    gap: space[2],
  },
  centerText: {
    textAlign: 'center',
  },
  title: {
    fontFamily: fonts.title,
    fontSize: TITLE_SIZE,
    lineHeight: TITLE_LINE_HEIGHT,
    letterSpacing: titleLetterSpacing(TITLE_SIZE),
    textAlign: 'center',
  },
  centered: {
    alignItems: 'center',
  },
  streakNumber: {
    fontFamily: fonts.title,
    fontSize: STREAK_NUMBER_SIZE,
    lineHeight: STREAK_NUMBER_LINE_HEIGHT,
    letterSpacing: titleLetterSpacing(STREAK_NUMBER_SIZE),
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
  streakTitle: {
    fontFamily: fonts.title,
    fontSize: STREAK_TITLE_SIZE,
    lineHeight: STREAK_TITLE_LINE_HEIGHT,
    letterSpacing: titleLetterSpacing(STREAK_TITLE_SIZE),
    textAlign: 'center',
  },
});
