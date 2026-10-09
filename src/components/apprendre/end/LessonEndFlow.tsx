import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ReactNode, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppText from '@/src/components/common/AppText';
import Button from '@/src/components/common/Button';
import GoldHalo from '@/src/components/common/GoldHalo';
import Stagger from '@/src/components/common/Stagger';
import { ValAvatar, ValPicture } from '@/src/components/common/ValBubble';
import { durations, springs } from '@/src/constants/motion';
import { fonts, palette, space, titleLetterSpacing } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { useCountUp } from '@/src/hooks/useCountUp';
import { formatInteger } from '@/src/utils/format';
import { celebrate } from '@/src/utils/haptics';
import {
  END_BUTTON_LABELS,
  endSentence,
  endSteps,
  EndStep,
  LessonResult,
  chestLabel,
  pickLabel,
  streakDaysLabel,
  streakGain,
  totalVals,
} from '@/src/utils/lessonPlayer';

const NBSP = ' '; // espace insécable

const TITLE_SIZE = 32;
const TITLE_LINE_HEIGHT = 38;
const STREAK_TITLE_SIZE = 26;
const STREAK_TITLE_LINE_HEIGHT = 32;
const STREAK_NUMBER_SIZE = 88;
const STREAK_NUMBER_LINE_HEIGHT = 96;
const FIRE_SIZE = 120;
const FIRE_LINE_HEIGHT = 140;
const FIRE_FROM_SCALE = 0.3;
const GIFT_SIZE = 96;
const VAL_PROUD = 120;
// Val en buste sur sa lueur : le carré du halo fait au plus 1,5 fois le buste
const BUST_WIDTH = 170;
const BUST_HEIGHT = 190;
const HALO = 260;
const FADE_HEIGHT = 56;
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
  const [steps] = useState<EndStep[]>(() => endSteps(result, streakBefore));
  const [index, setIndex] = useState(0);

  const next = () => {
    if (index < steps.length - 1) setIndex(index + 1);
    else onDone();
  };

  const step = steps[index];
  const gain = streakGain(streakBefore, result.user?.streak);

  return (
    <EndLayout key={step}>
      {step === 'done' ? <DoneStep result={result} onNext={next} /> : null}
      {step === 'streak' && gain ? <StreakStep from={gain.from} to={gain.to} onNext={next} /> : null}
      {step === 'chest' ? <ChestStep result={result} onNext={next} /> : null}
      {step === 'module' ? <ModuleStep title={moduleTitle} onNext={next} /> : null}
    </EndLayout>
  );
}

function EndLayout({ children }: { children: ReactNode }) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {children}
    </SafeAreaView>
  );
}

// Haut centré + bouton en bas
function StepFrame({ children, button }: { children: ReactNode; button: ReactNode }) {
  return (
    <>
      <Stagger style={styles.center}>{children}</Stagger>
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
      <View style={styles.haloBox}>
        <GoldHalo />
        <View style={styles.bust} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <ValPicture mood="celebrant" frame="xl" style={styles.bustImage} />
          <LinearGradient colors={['transparent', colors.background]} style={styles.fade} pointerEvents="none" />
        </View>
      </View>

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
        <Stat value={`+${NBSP}${formatInteger(Math.round(valsShown))}`} label="Vals" />
      </View>
    </StepFrame>
  );
}

function Stat({ value, label, gold }: { value: string; label: string; gold?: boolean }) {
  return (
    <View style={styles.stat}>
      <AppText variant="title2" tone={gold ? 'gold' : 'text'} style={styles.tabular}>
        {value}
      </AppText>
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
        {/* Seul emoji de l'app */}
        <Text allowFontScaling={false} style={styles.fire}>
          🔥
        </Text>
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
// c. Coffre
// ---------------------------------------------------------------------------
function ChestStep({ result, onNext }: { result: LessonResult; onNext: () => void }) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const amount = result.chest?.amount ?? 0;
  const shown = Math.round(useCountUp(amount, { delay: COUNT_START }));

  return (
    <StepFrame button={<Button label="Super" onPress={onNext} />}>
      <View style={styles.centered} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Ionicons name="gift-outline" size={GIFT_SIZE} color={colors.gold} />
      </View>
      <View style={styles.texts} accessible accessibilityLabel={`${chestLabel(result.chest?.rarity)} : ${amount} Vals`}>
        <Title>{chestLabel(result.chest?.rarity)}</Title>
        <AppText variant="hero" tone="gold" style={styles.centerText}>
          {`+${NBSP}${formatInteger(shown)}${NBSP}Vals`}
        </AppText>
      </View>
    </StepFrame>
  );
}

// ---------------------------------------------------------------------------
// d. Module terminé
// ---------------------------------------------------------------------------
function ModuleStep({ title, onNext }: { title: string | null; onNext: () => void }) {
  return (
    <StepFrame button={<Button label="Voir la suite" onPress={onNext} />}>
      <View style={styles.centered}>
        <ValAvatar mood="fier" diameter={VAL_PROUD} />
      </View>
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
  center: {
    flex: 1,
    // Chaque élément se centre lui-même : la rangée de chiffres prend toute la largeur
    alignItems: 'stretch',
    justifyContent: 'center',
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
  haloBox: {
    alignSelf: 'center',
    width: HALO,
    height: HALO,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bust: {
    width: BUST_WIDTH,
    height: BUST_HEIGHT,
    overflow: 'hidden',
  },
  bustImage: {
    position: 'absolute',
    top: 0,
    left: (BUST_WIDTH - BUST_HEIGHT) / 2,
    width: BUST_HEIGHT,
    height: BUST_HEIGHT,
  },
  fade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: FADE_HEIGHT,
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
  statRule: {
    width: 1,
    alignSelf: 'stretch',
  },
  tabular: {
    fontVariant: ['tabular-nums'],
  },
  fire: {
    fontSize: FIRE_SIZE,
    lineHeight: FIRE_LINE_HEIGHT,
    textAlign: 'center',
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
