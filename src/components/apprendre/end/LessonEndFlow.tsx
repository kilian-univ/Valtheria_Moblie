import { ReactNode, useEffect, useRef, useState } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppText from '@/src/components/common/AppText';
import Button from '@/src/components/common/Button';
import Stagger from '@/src/components/common/Stagger';
import ValsCoin from '@/src/components/common/ValsCoin';
import ChestReveal, { CHEST_IMAGES, COIN_LG } from './ChestReveal';
import ValBubble from '@/src/components/common/ValBubble';
import ValFullBody, { ValFitContext } from '@/src/components/common/ValFullBody';
import { durations, springs } from '@/src/constants/motion';
import { fonts, palette, space, titleLetterSpacing } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { useCountUp } from '@/src/hooks/useCountUp';
import { formatInteger } from '@/src/utils/format';
import { nextExcess } from '@/src/utils/fit';
import { celebrate } from '@/src/utils/haptics';
import GoldConfetti from '@/src/components/common/GoldConfetti';
import MedalCelebration from '@/src/components/common/MedalCelebration';
import StreakFlame from '@/src/components/common/StreakFlame';
import { useApi } from '@/src/context/ApiContext';
import { streakRewardsStore } from '@/src/state/streakRewards';
import { type Medal, medalToCelebrate } from '@/src/utils/streakRewards';
import {
  END_BUTTON_LABELS,
  endSentence,
  endSteps,
  EndStep,
  LessonResult,
  chestAmount,
  chestRarity,
  pickLabel,
  streakDaysLabel,
  streakGain,
  totalVals,
} from '@/src/utils/lessonPlayer';

const NBSP = ' '; // espace insécable

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
const SURPRISE_CHEST = 160;
// Pièce à côté du chiffre « Vals »
const COIN_STAT = 22;
const VAL_SURPRISE = 64;
// Val en pied (saut, fier) : réduit sur petit écran, 160 au minimum
const VAL_FULL_HEIGHT = 260;
// Les chiffres défilent l'un après l'autre, une fois l'écran apparu
const COUNT_START = durations.enterOpacity;

type LessonEndFlowProps = {
  result: LessonResult;
  // Série de jours avant la leçon (null : inconnue)
  streakBefore: number | null;
  moduleTitle: string | null;
  // Dernier bouton : retour là d'où l'on vient
  onDone: () => void;
};

// Suite d'écrans de fin, en sautant ceux qui ne s'appliquent pas.
export default function LessonEndFlow({ result, streakBefore, moduleTitle, onDone }: LessonEndFlowProps) {
  const { user } = useApi();
  const [baseSteps] = useState<EndStep[]>(() => endSteps(result, streakBefore));
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
      {step === 'done' ? <DoneStep result={result} onNext={next} /> : null}
      {step === 'streak' && gain ? <StreakStep from={gain.from} to={gain.to} onNext={next} /> : null}
      {step === 'medal' && medal ? <MedalStep medal={medal} onNext={next} /> : null}
      {step === 'chest' ? <ChestStep result={result} onNext={next} /> : null}
      {step === 'surprise' ? <SurpriseStep result={result} onNext={next} /> : null}
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
// a. Leçon terminée
// ---------------------------------------------------------------------------
function DoneStep({ result, onNext }: { result: LessonResult; onNext: () => void }) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const [label] = useState(() => pickLabel(END_BUTTON_LABELS));

  const xp = result.xp_gained ?? 0;
  const firstTry = result.first_try_correct ?? 0;
  const total = result.scored_total ?? 0;
  const vals = totalVals(result);
  const showFirstTry = total > 0;

  const xpShown = useCountUp(xp, { delay: COUNT_START });
  const firstTryShown = useCountUp(firstTry, { delay: COUNT_START + durations.counter });
  const valsShown = useCountUp(vals, { delay: COUNT_START + durations.counter * (showFirstTry ? 2 : 1) });

  useEffect(() => {
    celebrate();
  }, []);

  return (
    <StepFrame button={<Button label={label} onPress={onNext} />}>
      <ValFullBody pose="saut" height={VAL_FULL_HEIGHT} bounce halo />

      <View style={styles.texts}>
        <Title>Leçon terminée !</Title>
        <AppText variant="body" tone="subtitle" style={styles.centerText}>
          {endSentence(firstTry, total)}
        </AppText>
      </View>

      <View
        style={styles.stats}
        accessible
        accessibilityLabel={[
          `${xp} XP gagnés`,
          showFirstTry ? `${firstTry} sur ${total} du premier coup` : null,
          `${vals} Vals gagnés`,
        ]
          .filter(Boolean)
          .join(', ')}
      >
        <Stat value={`+${NBSP}${formatInteger(Math.round(xpShown))}`} label="XP" gold />
        {showFirstTry ? (
          <>
            <View style={[styles.statRule, { backgroundColor: colors.border }]} />
            <Stat value={`${Math.round(firstTryShown)}/${total}`} label="Premier coup" />
          </>
        ) : null}
        <View style={[styles.statRule, { backgroundColor: colors.border }]} />
        <Stat value={`+${NBSP}${formatInteger(Math.round(valsShown))}`} label="Vals" coin />
      </View>
    </StepFrame>
  );
}

function Stat({ value, label, gold, coin }: { value: string; label: string; gold?: boolean; coin?: boolean }) {
  return (
    <View style={styles.stat}>
      <View style={styles.statValueRow}>
        {coin ? <ValsCoin size={COIN_STAT} /> : null}
        <AppText variant="title2" tone={gold ? 'gold' : 'text'} style={styles.tabular}>
          {value}
        </AppText>
      </View>
      <AppText variant="caption" tone="subtitle">
        {label}
      </AppText>
    </View>
  );
}

// ---------------------------------------------------------------------------
// b. Série augmentée
// ---------------------------------------------------------------------------
function StreakStep({ from, to, onNext }: { from: number; to: number; onNext: () => void }) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(reduced ? 1 : FIRE_FROM_SCALE);
  const shown = Math.round(useCountUp(to, { from, delay: COUNT_START }));

  useEffect(() => {
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
// c. Coffre
// ---------------------------------------------------------------------------
function ChestStep({ result, onNext }: { result: LessonResult; onNext: () => void }) {
  return (
    <StepFrame button={<Button label="Super" onPress={onNext} />}>
      <ChestReveal rarity={chestRarity(result.chest?.rarity)} amount={chestAmount(result.chest)} />
    </StepFrame>
  );
}

// ---------------------------------------------------------------------------
// c bis. Coffre surprise (bonus occasionnel du serveur)
// ---------------------------------------------------------------------------
function SurpriseStep({ result, onNext }: { result: LessonResult; onNext: () => void }) {
  const amount = chestAmount(result.surprise_chest);
  const shown = Math.round(useCountUp(amount, { delay: COUNT_START }));

  return (
    <StepFrame button={<Button label="Génial" onPress={onNext} />}>
      <View style={styles.texts} accessible accessibilityLabel={`Coffre surprise : ${amount} Vals`}>
        <View style={styles.centered} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Image source={CHEST_IMAGES.legendaire} resizeMode="contain" style={styles.surpriseChest} />
        </View>
        <Title>Coffre surprise !</Title>
        <View style={styles.amountRow}>
          <ValsCoin size={COIN_LG} />
          <AppText variant="hero" tone="gold" style={styles.centerText}>
            {`+${NBSP}${formatInteger(shown)}${NBSP}Vals`}
          </AppText>
        </View>
      </View>
      <ValBubble mood="complice" text="Celui-là, tu ne l’attendais pas." diameter={VAL_SURPRISE} />
    </StepFrame>
  );
}

// ---------------------------------------------------------------------------
// d. Module terminé
// ---------------------------------------------------------------------------
function ModuleStep({ title, onNext }: { title: string | null; onNext: () => void }) {
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
  surpriseChest: {
    width: SURPRISE_CHEST,
    height: SURPRISE_CHEST,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: space[1],
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1],
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[2],
    flexWrap: 'wrap',
  },
  statRule: {
    width: 1,
    alignSelf: 'stretch',
  },
  tabular: {
    fontVariant: ['tabular-nums'],
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
