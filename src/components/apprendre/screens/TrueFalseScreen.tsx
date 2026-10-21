import { Ionicons } from '@expo/vector-icons';
import { useEffect, useEffectEvent, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import AppText from '@/src/components/common/AppText';
import Sheen from '@/src/components/common/Sheen';
import { motion, springs, timing } from '@/src/constants/motion';
import {
  fonts,
  opacityDisabled,
  palette,
  radius,
  size,
  space,
  titleLetterSpacing,
  withOpacity,
} from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { trueFalseReaction, trueFalseResults, trueFalseScore } from '@/src/lesson/interactive';
import { grade } from '@/src/utils/grade';
import type { TrueFalseScreen as TrueFalseModel } from '@/src/lesson/model';
import { safeGesture } from '@/src/utils/gestureSafety';
import { useScreenReader } from '@/src/hooks/useScreenReader';
import { announce } from '@/src/utils/announce';
import { feedback } from '@/src/utils/feedback';
import RoundChoice from '../player/RoundChoice';
import ScreenIntro from '../player/ScreenIntro';
import { useEdgeFlash } from '../player/EdgeFlash';
import { useScrollLock } from '../player/ScrollLock';
import StepDots, { StepState } from '../player/StepDots';
import { LessonScreenProps } from '../types';

// Balayage : au-delà d'un tiers de l'écran, ou d'un geste vif, la carte part
const SWIPE_RATIO = 1 / 3;
const SWIPE_VELOCITY = 800;
const MAX_TILT = 12; // degrés
const REST_TILT = -1.5;
// La carte sort de l'écran avant de revenir montrer son verdict (300 ms) ;
// réglage calculé une fois, hors du geste
const FLY_OUT = 1.2;
const FLY = timing(motion.screen);
const CARD_HEIGHT = 236;
// Grand texte : la carte grandit avec l'affirmation (plafonnée à 1,3), au
// lieu de la couper par le bas (lot 7)
const STATEMENT_MAX_SCALE = 1.3;
const CARD_DEPTH = 8;
const STATEMENT_SIZE = 27;
// Verdict : grande icône dans un cercle, « Bien vu ! » ou « Raté ! »
const VERDICT_ICON = 64;
const VERDICT_BADGE = 84;
const VERDICT_TITLE = 30;
const BUMP = 14;
const SHAKE = 8;
const TINT_MAX = 0.18;
const STAMP_TILT = 12;
const ARRIVE_FROM = 0.94;
// Cartes du dessous : inclinaison, décalage vers le bas, retrait sur les côtés
const BACK_TILTS = [-3, 4];
const BACK_DROP = 16;
const BACK_INSET = 14;
// Ombre de la carte du dessus, assez légère pour laisser voir la pile
const CARD_SHADOW = { offsetX: 0, offsetY: 10, blurRadius: 18, opacity: 0.45 };
const COUNTDOWN = 20;
const COUNTDOWN_STROKE = 3;

type Phase = 'ask' | 'verdict' | 'done';

// La consigne générique est déjà dite par Val
function isGenericQuestion(question: string | null): boolean {
  return !question || /^vrai ou faux\s*\??$/i.test(question.trim());
}

// true_false — vrai ou faux en rafale. Une pile de cartes : balayer à droite
// pour Vrai, à gauche pour Faux, ou les deux grands boutons ronds. La carte
// part du bon côté, revient au centre et montre son verdict ; la suivante
// arrive seule après 1,5 s (un toucher l'amène tout de suite). Après la
// dernière, la feuille de réponse avec le score. Réussi à partir de
// screen.pass bonnes réponses. Réponse : { id de carte: bool }.
export default function TrueFalseScreen({ screen, answered, onDraftChange, setVal }: LessonScreenProps<TrueFalseModel>) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const reduced = useReducedMotion();
  const { width, fontScale } = useWindowDimensions();
  const cardHeight = Math.round(CARD_HEIGHT * Math.min(Math.max(fontScale, 1), STATEMENT_MAX_SCALE));
  const lockScroll = useScrollLock();
  const flashEdges = useEdgeFlash();
  const { cards } = screen;

  const [answers, setAnswers] = useState<boolean[]>([]);
  const [phase, setPhase] = useState<Phase>('ask');
  const index = phase === 'ask' ? answers.length : answers.length - 1;
  const card = cards[Math.min(Math.max(index, 0), cards.length - 1)];
  const results = trueFalseResults(screen, answers);
  const right = phase === 'ask' ? null : results[index];
  const threshold = width * SWIPE_RATIO;

  const x = useSharedValue(0);
  // 1 pendant la question : teinte et tampon suivent le doigt
  const live = useSharedValue(1);
  const tilt = useSharedValue(reduced ? 0 : REST_TILT);
  const arrive = useSharedValue(1);
  const choices = useSharedValue(1);
  // Verdict : petit saut si c'est juste, tremblement si c'est faux
  const bump = useSharedValue(0);
  const shake = useSharedValue(0);

  // Carte jouée (bouton ou balayage) : son verdict part au geste même,
  // sans attendre que la carte ait fini de partir
  const decided = useSharedValue(false);

  // Carte suivante, ou fin de la pile : le lecteur ouvre la feuille
  const advance = (given: boolean[]) => {
    if (given.length < cards.length) {
      decided.set(false);
      // La carte suivante arrive, avec un glissement très doux
      feedback.cardIn();
      setPhase('ask');
      x.set(0);
      live.set(1);
      choices.set(reduced ? 1 : withTiming(1, timing(motion.state)));
      tilt.set(reduced ? 0 : REST_TILT);
      if (!reduced) {
        arrive.set(ARRIVE_FROM);
        arrive.set(withSpring(1, springs.enter));
      }
      return;
    }
    setPhase('done');
    const score = trueFalseScore(screen, given);
    const raw = Object.fromEntries(cards.map((c, i) => [c.id, given[i]]));
    onDraftChange({
      raw,
      correct: grade(screen.source, raw) === true,
      correctText: null,
      explanation: `${score} ${score >= 2 ? 'bonnes réponses' : 'bonne réponse'} sur ${cards.length}.`,
      autoSubmit: true,
    });
  };

  // Premier signal, au geste : la carte part (swipe) et as-tu eu bon ?
  // Bords de l'écran, vibration, son. Une seule fois par carte.
  const decide = (value: boolean) => {
    if (phase !== 'ask' || decided.get() || answers.length >= cards.length) return false;
    decided.set(true);
    const ok = value === cards[answers.length].answer;
    feedback.swipe();
    flashEdges(ok);
    if (ok) feedback.right();
    else feedback.wrong();
    return true;
  };

  // La carte est jouée : verdict sur place, Val réagit
  const record = (value: boolean) => {
    if (phase !== 'ask' || answers.length >= cards.length) return;
    const i = answers.length;
    const given = [...answers, value];
    const ok = value === cards[i].answer;
    setAnswers(given);
    setPhase('verdict');
    setVal(trueFalseReaction(ok, i));
    if (!reduced) {
      // Une fois la carte revenue au centre
      if (ok) {
        bump.set(withDelay(motion.screen, withSequence(withTiming(-BUMP, timing(motion.tap)), withSpring(0, springs.celebrate))));
      } else {
        const quarter = timing(motion.shake / 4);
        shake.set(
          withDelay(
            motion.screen,
            withSequence(withTiming(SHAKE, quarter), withTiming(-SHAKE, quarter), withTiming(SHAKE / 2, quarter), withTiming(0, quarter))
          )
        );
      }
    }
    live.set(0);
    choices.set(reduced ? opacityDisabled : withTiming(opacityDisabled, timing(motion.state)));
    // Elle revient au centre, droite, pour montrer son verdict
    tilt.set(reduced ? 0 : withTiming(0, timing(motion.screen)));
    x.set(reduced ? 0 : withTiming(0, timing(motion.screen)));
  };

  // Verdict affiché : la carte suivante arrive seule après 1,5 s (une
  // attente par verdict ; advance lit les réponses données à ce moment-là).
  // Lecteur d'écran actif : rien n'avance tout seul, le verdict est annoncé
  // et le bouton « Carte suivante » fait passer (audit I13).
  const screenReader = useScreenReader();
  const next = useEffectEvent(() => advance(answers));
  useEffect(() => {
    if (phase !== 'verdict' || screenReader) return;
    const timer = setTimeout(() => next(), motion.nextCard);
    return () => clearTimeout(timer);
  }, [phase, answers, screenReader]);

  // Bouton : la carte part du bon côté, comme balayée
  const send = (value: boolean) => {
    if (answered || !decide(value)) return;
    if (reduced) {
      record(value);
      return;
    }
    x.set(
      withTiming((value ? 1 : -1) * width * FLY_OUT, FLY, (finished) => {
        'worklet';
        if (finished) scheduleOnRN(record, value);
      })
    );
  };

  const skip = () => {
    if (phase === 'verdict') advance(answers);
  };

  // Carte remise au centre si un geste échoue
  const recover = () => {
    'worklet';
    x.set(0);
  };

  const pan = Gesture.Pan()
    .enabled(phase === 'ask' && !answered)
    .activeOffsetX([-12, 12])
    .failOffsetY([-14, 14])
    // Pendant le balayage, la page ne défile pas
    .onStart(
      safeGesture(() => {
        'worklet';
        scheduleOnRN(lockScroll, true);
      })
    )
    .onFinalize(
      safeGesture(() => {
        'worklet';
        scheduleOnRN(lockScroll, false);
      })
    )
    .onUpdate(
      safeGesture((e: { translationX: number }) => {
        'worklet';
        x.set(e.translationX);
      }, recover)
    )
    .onEnd(
      safeGesture((e: { translationX: number; velocityX: number }) => {
        'worklet';
        const toRight = e.translationX > threshold || e.velocityX > SWIPE_VELOCITY;
        const toLeft = e.translationX < -threshold || e.velocityX < -SWIPE_VELOCITY;
        if (!toRight && !toLeft) {
          x.set(reduced ? 0 : withSpring(0, springs.press));
          return;
        }
        scheduleOnRN(decide, toRight);
        if (reduced) {
          scheduleOnRN(record, toRight);
          return;
        }
        x.set(
          withTiming((toRight ? 1 : -1) * width * FLY_OUT, FLY, (finished) => {
            'worklet';
            if (finished) scheduleOnRN(record, toRight);
          })
        );
      }, recover)
    );
  const tap = Gesture.Tap()
    .enabled(phase === 'verdict')
    .onEnd(
      safeGesture(() => {
        'worklet';
        scheduleOnRN(skip);
      })
    );
  const gesture = Gesture.Race(pan, tap);

  const cardStyle = useAnimatedStyle(() => {
    const p = Math.max(-1, Math.min(1, x.get() / threshold));
    const rotate = reduced ? 0 : Math.max(-MAX_TILT, Math.min(MAX_TILT, tilt.get() + p * MAX_TILT));
    return {
      transform: [
        { translateX: x.get() + shake.get() },
        { translateY: bump.get() },
        { rotate: `${rotate}deg` },
        { scale: arrive.get() },
      ],
    };
  });
  const trueTint = useAnimatedStyle(() => ({ opacity: live.get() * Math.max(0, Math.min(1, x.get() / threshold)) * TINT_MAX }));
  const falseTint = useAnimatedStyle(() => ({ opacity: live.get() * Math.max(0, Math.min(1, -x.get() / threshold)) * TINT_MAX }));
  const trueStamp = useAnimatedStyle(() => ({ opacity: live.get() * Math.max(0, Math.min(1, x.get() / (threshold * 0.6))) }));
  const falseStamp = useAnimatedStyle(() => ({ opacity: live.get() * Math.max(0, Math.min(1, -x.get() / (threshold * 0.6))) }));
  const choicesStyle = useAnimatedStyle(() => ({ opacity: choices.get() }));

  // Cartes jouées en vert ou rouge, la prochaine en or
  const steps: StepState[] = cards.map((_, i) =>
    i < answers.length ? (results[i] ? 'right' : 'wrong') : i === answers.length ? 'current' : 'todo'
  );
  // Verdict : toute la carte prend la couleur de TA réussite (fond plein
  // assombri, texte lisible) ; la vérité de l'affirmation vient en texte
  const verdictInk = right === null ? colors.goldRing : right ? colors.success : colors.error;
  const verdictFace = right === null ? colors.optionFace : right ? colors.successSheet : colors.dangerSheet;
  const truth = `${card.answer ? 'C’est vrai' : 'C’est faux'}${card.explanation ? ` : ${card.explanation}` : '.'}`;
  // VoiceOver : verdict et explication annoncés dès qu'ils s'affichent
  const announceVerdict = useEffectEvent(() => announce(`${right ? 'Bien vu !' : 'Raté !'} ${truth}`, 300));
  useEffect(() => {
    if (phase === 'verdict') announceVerdict();
  }, [phase]);
  const behind = Math.min(BACK_TILTS.length, cards.length - 1 - Math.max(index, 0));

  return (
    <View style={styles.wrap}>
      {isGenericQuestion(screen.question) ? null : <ScreenIntro screen={screen} />}

      <View style={styles.center}>
        <StepDots steps={steps} accessibilityLabel={`Carte ${Math.max(index, 0) + 1} sur ${cards.length}`} />

        <View style={styles.stage}>
          <View style={styles.hint} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
            <Ionicons name="chevron-back" size={18} color={colors.error} />
            <AppText style={[styles.hintText, { color: colors.error }]}>FAUX</AppText>
          </View>

          <View style={[styles.pile, { height: cardHeight + 2 * BACK_DROP }]}>
            {/* Cartes du dessous, plus sombres */}
            {BACK_TILTS.slice(0, behind).map((deg, i) => (
              <View
                key={i}
                style={[
                  styles.back,
                  {
                    height: cardHeight - 4,
                    backgroundColor: i === 0 ? colors.pileBack : colors.pileBackDeep,
                    transform: [{ rotate: `${reduced ? 0 : deg}deg` }],
                    top: BACK_DROP * (i + 1),
                    left: BACK_INSET * (i + 1),
                    right: BACK_INSET * (i + 1),
                  },
                ]}
              />
            ))}

            <GestureDetector gesture={gesture} touchAction="pan-y">
              <Animated.View
                style={cardStyle}
                accessible
                accessibilityLabel={
                  right === null ? card.statement : `${right ? 'Bien vu !' : 'Raté !'} ${truth}`
                }
                accessibilityLiveRegion="polite"
              >
                <View
                  style={[
                    styles.cardEdge,
                    {
                      height: cardHeight,
                      backgroundColor: colors.optionEdge,
                      boxShadow: [{ ...CARD_SHADOW, color: withOpacity(colors.groundShadow, CARD_SHADOW.opacity) }],
                    },
                  ]}
                />
                <View style={[styles.card, { height: cardHeight, backgroundColor: verdictFace, borderColor: verdictInk }]}>
                  <Sheen spots={[{ cx: 0.3, cy: 0, r: 0.55, color: colors.nodeHighlight, opacity: 0.08 }]} />
                  <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.success }, trueTint]} />
                  <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.error }, falseTint]} />

                  {right === null ? (
                    <>
                      <Animated.View style={[styles.stamp, styles.stampTrue, { borderColor: colors.success }, trueStamp]}>
                        <AppText style={[styles.stampText, { color: colors.success }]}>VRAI</AppText>
                      </Animated.View>
                      <Animated.View style={[styles.stamp, styles.stampFalse, { borderColor: colors.error }, falseStamp]}>
                        <AppText style={[styles.stampText, { color: colors.error }]}>FAUX</AppText>
                      </Animated.View>
                      <AppText maxFontSizeMultiplier={1.3} style={styles.statement}>
                        {card.statement}
                      </AppText>
                    </>
                  ) : (
                    <View style={styles.verdict}>
                      <View style={[styles.verdictBadge, { backgroundColor: verdictInk }]}>
                        <Ionicons name={right ? 'checkmark' : 'close'} size={VERDICT_ICON} color={colors.onGold} />
                      </View>
                      <AppText maxFontSizeMultiplier={1.3} style={styles.verdictTitle}>
                        {right ? 'Bien vu\u00A0!' : 'Raté\u00A0!'}
                      </AppText>
                      <AppText variant="body" maxFontSizeMultiplier={1.6} style={styles.truth}>
                        {truth}
                      </AppText>
                    </View>
                  )}
                </View>
              </Animated.View>
            </GestureDetector>
          </View>

          <View style={styles.hint} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
            <Ionicons name="chevron-forward" size={18} color={colors.success} />
            <AppText style={[styles.hintText, { color: colors.success }]}>VRAI</AppText>
          </View>
        </View>

        <Animated.View style={[styles.choices, choicesStyle]}>
          <RoundChoice kind="false" onPress={() => send(false)} disabled={phase !== 'ask' || answered} />
          <RoundChoice kind="true" onPress={() => send(true)} disabled={phase !== 'ask' || answered} />
        </Animated.View>

        <View style={styles.countdownSlot}>
          {phase === 'verdict' ? (
            <Pressable
              onPress={skip}
              accessibilityRole="button"
              accessibilityLabel={answers.length < cards.length ? 'Carte suivante' : 'Voir mon score'}
              style={styles.countdown}
            >
              <Countdown key={answers.length} />
              <AppText variant="callout" tone="subtitle">
                {screenReader
                  ? answers.length < cards.length
                    ? 'Touche pour passer à la carte suivante'
                    : 'Touche pour voir ton score'
                  : answers.length < cards.length
                    ? 'Carte suivante… touche pour passer'
                    : 'Ton score arrive… touche pour passer'}
              </AppText>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

// Petit anneau qui se remplit en 1,5 s (immobile avec les animations réduites)
function Countdown() {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const reduced = useReducedMotion();
  const [progress, setProgress] = useState(reduced ? 1 : 0);

  useEffect(() => {
    if (reduced) return;
    let frame = 0;
    let begin: number | null = null;
    const tick = (now: number) => {
      if (begin === null) begin = now;
      const p = Math.min(1, (now - begin) / motion.nextCard);
      setProgress(p);
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [reduced]);

  const r = (COUNTDOWN - COUNTDOWN_STROKE) / 2;
  const length = 2 * Math.PI * r;
  return (
    <Svg width={COUNTDOWN} height={COUNTDOWN}>
      <Circle cx={COUNTDOWN / 2} cy={COUNTDOWN / 2} r={r} stroke={colors.surface} strokeWidth={COUNTDOWN_STROKE} fill="none" />
      <Circle
        cx={COUNTDOWN / 2}
        cy={COUNTDOWN / 2}
        r={r}
        stroke={colors.gold}
        strokeWidth={COUNTDOWN_STROKE}
        fill="none"
        strokeDasharray={`${length}`}
        strokeDashoffset={length * (1 - progress)}
        transform={`rotate(-90 ${COUNTDOWN / 2} ${COUNTDOWN / 2})`}
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    gap: space[5],
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    gap: space[5],
  },
  stage: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: -space[3],
  },
  hint: {
    width: 36,
    alignItems: 'center',
    gap: 2,
    opacity: 0.85,
  },
  hintText: {
    fontFamily: fonts.bodyExtraBold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 1,
  },
  pile: {
    flex: 1,
    height: CARD_HEIGHT + 2 * BACK_DROP,
  },
  back: {
    position: 'absolute',
    height: CARD_HEIGHT - 4,
    borderRadius: radius.lg + 2,
    borderCurve: 'continuous',
  },
  cardEdge: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: CARD_DEPTH,
    height: CARD_HEIGHT,
    borderRadius: radius.lg + 2,
    borderCurve: 'continuous',
  },
  card: {
    height: CARD_HEIGHT,
    borderRadius: radius.lg + 2,
    borderCurve: 'continuous',
    borderWidth: 1.5,
    padding: space[5],
    justifyContent: 'center',
    overflow: 'hidden',
  },
  statement: {
    fontFamily: fonts.title,
    fontSize: STATEMENT_SIZE,
    lineHeight: STATEMENT_SIZE + 7,
    letterSpacing: titleLetterSpacing(STATEMENT_SIZE),
    textAlign: 'center',
  },
  stamp: {
    position: 'absolute',
    top: space[4],
    borderWidth: 3,
    borderRadius: radius.md - 2,
    paddingHorizontal: space[3],
    paddingVertical: space[1],
  },
  stampTrue: {
    left: space[4],
    transform: [{ rotate: `-${STAMP_TILT}deg` }],
  },
  stampFalse: {
    right: space[4],
    transform: [{ rotate: `${STAMP_TILT}deg` }],
  },
  stampText: {
    fontFamily: fonts.bodyExtraBold,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: 2,
  },
  verdict: {
    alignItems: 'center',
    gap: space[2],
  },
  verdictBadge: {
    width: VERDICT_BADGE,
    height: VERDICT_BADGE,
    borderRadius: VERDICT_BADGE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verdictTitle: {
    fontFamily: fonts.title,
    fontSize: VERDICT_TITLE,
    lineHeight: VERDICT_TITLE + 6,
    letterSpacing: titleLetterSpacing(VERDICT_TITLE),
    textAlign: 'center',
  },
  truth: {
    textAlign: 'center',
  },
  choices: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: space[10] + space[4],
  },
  countdownSlot: {
    minHeight: size.tapMin,
    justifyContent: 'center',
  },
  countdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[2] + 2,
    minHeight: size.tapMin,
  },
});
