import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import AppText from '@/src/components/common/AppText';
import Button from '@/src/components/common/Button';
import { durations, springs } from '@/src/constants/motion';
import { palette, radius, space } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { trueFalsePassed, trueFalseResults, trueFalseScore } from '@/src/lesson/interactive';
import type { TrueFalseScreen as TrueFalseModel } from '@/src/lesson/model';
import { error as errorHaptic, success as successHaptic } from '@/src/utils/haptics';
import ReliefOption from '../player/ReliefOption';
import ScreenIntro from '../player/ScreenIntro';
import { LessonScreenProps } from '../types';

// Distance (ou vitesse) de balayage qui vaut réponse
const SWIPE_DISTANCE = 110;
const SWIPE_VELOCITY = 800;
const FLY_OUT = 500;
const MAX_TILT = 12; // degrés

// true_false — vrai ou faux en rafale. Une pile de cartes : balayer à droite
// pour Vrai, à gauche pour Faux, ou les deux boutons en dessous. Après chaque
// carte : verdict coloré, vibration, explication, puis la suivante. Réussi à
// partir de screen.pass bonnes réponses. Réponse : { id de carte: bool }.
export default function TrueFalseScreen({ screen, answered, onDraftChange }: LessonScreenProps<TrueFalseModel>) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const reduced = useReducedMotion();
  const { cards } = screen;

  const [answers, setAnswers] = useState<boolean[]>([]);
  // Carte jouée dont on montre le verdict, avant la suivante
  const [shownVerdict, setShownVerdict] = useState(false);
  const [finished, setFinished] = useState(false);

  const index = shownVerdict ? answers.length - 1 : answers.length;
  const card = cards[Math.min(index, cards.length - 1)];
  const results = trueFalseResults(screen, answers);
  const lastCorrect = shownVerdict ? results[answers.length - 1] : null;

  const x = useSharedValue(0);

  const answer = (value: boolean) => {
    if (shownVerdict || finished || answers.length >= cards.length) return;
    const next = [...answers, value];
    setAnswers(next);
    setShownVerdict(true);
    if (next[next.length - 1] === cards[next.length - 1].answer) successHaptic();
    else errorHaptic();
    // La carte revient au centre pour montrer son verdict
    x.set(reduced ? 0 : withSpring(0, springs.enter));
  };

  const nextCard = () => {
    if (answers.length < cards.length) {
      setShownVerdict(false);
      return;
    }
    // Dernière carte : le lecteur ouvre la feuille de réponse
    setFinished(true);
    const score = trueFalseScore(screen, answers);
    const raw = Object.fromEntries(cards.map((c, i) => [c.id, answers[i]]));
    onDraftChange({
      raw,
      correct: trueFalsePassed(screen, answers),
      correctText: null,
      explanation: `${score} ${score >= 2 ? 'bonnes réponses' : 'bonne réponse'} sur ${cards.length}.`,
      autoSubmit: true,
    });
  };

  const swipe = Gesture.Pan()
    .enabled(!shownVerdict && !finished && !answered)
    .activeOffsetX([-12, 12])
    .failOffsetY([-14, 14])
    .onUpdate((e) => {
      x.set(e.translationX);
    })
    .onEnd((e) => {
      const goRight = e.translationX > SWIPE_DISTANCE || e.velocityX > SWIPE_VELOCITY;
      const goLeft = e.translationX < -SWIPE_DISTANCE || e.velocityX < -SWIPE_VELOCITY;
      if (goRight || goLeft) {
        x.set(withTiming(goRight ? FLY_OUT : -FLY_OUT, { duration: durations.fade }, () => {
          scheduleOnRN(answer, goRight);
        }));
      } else {
        x.set(withSpring(0, springs.press));
      }
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.get() }, { rotate: `${(x.get() / FLY_OUT) * MAX_TILT}deg` }],
  }));

  const verdictColor = lastCorrect === null ? colors.controlBorder : lastCorrect ? colors.success : colors.error;
  const verdictTint = lastCorrect === null ? colors.surface : lastCorrect ? colors.successSoft : colors.dangerSoft;
  const done = finished || answered;

  return (
    <View style={styles.wrap}>
      <ScreenIntro screen={screen} hint="Balaie à droite pour Vrai, à gauche pour Faux." />

      {done ? (
        // Récapitulatif, visible au-dessus de la feuille repliée
        <View style={styles.recap}>
          {cards.map((c, i) => (
            <View
              key={c.id}
              style={[styles.recapRow, { borderColor: results[i] ? colors.success : colors.error }]}
              accessible
              accessibilityLabel={`${c.statement} ${c.answer ? 'Vrai' : 'Faux'}. ${results[i] ? 'Bonne réponse' : 'Mauvaise réponse'}.`}
            >
              <Ionicons
                name={results[i] ? 'checkmark-circle' : 'close-circle'}
                size={22}
                color={results[i] ? colors.success : colors.error}
              />
              <View style={styles.recapTexts}>
                <AppText variant="callout">{c.statement}</AppText>
                <AppText variant="caption" tone={results[i] ? 'success' : 'error'}>
                  {c.answer ? 'Vrai' : 'Faux'}
                </AppText>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <>
          <AppText variant="caption" tone="subtitle" style={styles.center}>
            Carte {index + 1} sur {cards.length}
          </AppText>

          <GestureHandlerRootView>
            <View style={styles.pile}>
              {/* La carte suivante, en dessous */}
              {index + 1 < cards.length ? (
                <View style={[styles.card, styles.under, { backgroundColor: colors.surface, borderColor: colors.controlBorder }]} />
              ) : null}
              <GestureDetector gesture={swipe}>
                <Animated.View
                  key={card.id}
                  entering={reduced ? undefined : FadeIn.duration(durations.fade)}
                  style={[styles.card, { backgroundColor: verdictTint, borderColor: verdictColor }, cardStyle]}
                  accessible
                  accessibilityLabel={card.statement}
                  accessibilityLiveRegion="polite"
                >
                  <AppText variant="title3" style={styles.center}>
                    {card.statement}
                  </AppText>
                  {lastCorrect !== null ? (
                    <View style={styles.verdict}>
                      <AppText variant="bodyMedium" tone={lastCorrect ? 'success' : 'error'} style={styles.center}>
                        {lastCorrect ? 'Bien vu' : 'Raté'} : c’est {card.answer ? 'vrai' : 'faux'}.
                      </AppText>
                      {card.explanation ? (
                        <AppText variant="callout" style={styles.center}>
                          {card.explanation}
                        </AppText>
                      ) : null}
                    </View>
                  ) : null}
                </Animated.View>
              </GestureDetector>
            </View>
          </GestureHandlerRootView>

          {shownVerdict ? (
            <Button
              variant="secondary"
              label={answers.length < cards.length ? 'Carte suivante' : 'Voir mon score'}
              onPress={nextCard}
            />
          ) : (
            <View style={styles.buttons}>
              <View style={styles.button}>
                <ReliefOption label="Faux" icon="close" state="idle" selected={false} onPress={() => answer(false)} />
              </View>
              <View style={styles.button}>
                <ReliefOption label="Vrai" icon="checkmark" state="idle" selected={false} onPress={() => answer(true)} />
              </View>
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: space[5],
  },
  center: {
    textAlign: 'center',
  },
  pile: {
    paddingBottom: space[2],
  },
  card: {
    minHeight: 200,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    borderWidth: 2,
    padding: space[5],
    justifyContent: 'center',
    gap: space[4],
  },
  // Bord de la carte suivante, qui dépasse sous la pile
  under: {
    position: 'absolute',
    left: space[3],
    right: space[3],
    top: space[2],
    bottom: 0,
  },
  verdict: {
    gap: space[2],
  },
  buttons: {
    flexDirection: 'row',
    gap: space[3],
  },
  button: {
    flex: 1,
  },
  recap: {
    gap: space[3],
  },
  recapRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space[3],
    padding: space[4],
    borderWidth: 2,
    borderRadius: radius.option,
    borderCurve: 'continuous',
  },
  recapTexts: {
    flex: 1,
    gap: space[1],
  },
});
