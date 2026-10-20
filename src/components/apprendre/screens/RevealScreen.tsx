import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import AppText from '@/src/components/common/AppText';
import BigNumber from '@/src/components/common/BigNumber';
import Pill from '@/src/components/common/Pill';
import { easeOut, motion, timing } from '@/src/constants/motion';
import { fonts, palette, radius, space } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { COUNT_STEP_MS } from '@/src/hooks/useCountUp';
import type { RevealScreen as RevealModel } from '@/src/lesson/model';
import { widestText, windowFitHeight } from '@/src/utils/fit';
import { formatNumber, withUnit } from '@/src/utils/format';
import { feedback } from '@/src/utils/feedback';
import { select, success, warning } from '@/src/utils/haptics';
import { estimateVerdict, revealExtraLines } from '@/src/utils/lessonPlayer';
import ScreenIntro from '../player/ScreenIntro';
import { LessonScreenProps } from '../types';

// Réduit sur un écran bas (iPhone SE), jamais sous VALUE_MIN
const VALUE_MIN = 60;
const VALUE_SIZE = 92;
const LABEL_SIZE = 12;
const LABEL_SPACING = 1.6;
const BAR_HEIGHT = 12;
// Petits crans pendant le défilement du chiffre (discrets : 4 au plus)
const ROLL_TICKS = 5;
const PILL_FROM = 0.9;

type Phase = 'wait' | 'roll' | 'verdict' | 'done';
type Bar = { key: string; label: string; value: number; tone: 'start' | 'guess' | 'actual' };

// reveal — le vrai chiffre. Jamais noté. Séquence : 300 ms de suspense, le
// chiffre défile de l'estimation au vrai (1 s, ease-out, crans discrets),
// vibration de réussite ou d'avertissement selon l'écart ; puis la pastille
// de verdict ; puis les barres (départ, estimation, en vrai) se remplissent
// l'une après l'autre. Un toucher affiche tout de suite l'état final.
// Animations réduites : état final directement (la vibration reste).
export default function RevealScreen({ screen, estimate, enterDelay, setVal }: LessonScreenProps<RevealModel>) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const reduced = useReducedMotion();
  const { value, unit, decimals, lines, label, start } = screen;
  const { height } = useWindowDimensions();
  const valueSize = windowFitHeight(VALUE_SIZE, VALUE_MIN, height);

  const verdict = estimate !== null ? estimateVerdict(estimate, value, unit, decimals) : null;
  const from = estimate ?? 0;

  const [phase, setPhase] = useState<Phase>(reduced ? 'done' : 'wait');
  const [shown, setShown] = useState(reduced ? value : from);
  const landed = useRef(false);
  const frame = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Barres : départ (pâle), estimation (ivoire), en vrai (or)
  const bars: Bar[] =
    estimate === null
      ? []
      : [
          ...(start ? [{ key: 'start', label: start.label, value: start.value, tone: 'start' as const }] : []),
          { key: 'guess', label: 'Ton estimation', value: estimate, tone: 'guess' },
          { key: 'actual', label: 'En vrai', value, tone: 'actual' },
        ];
  const scale = Math.max(1e-9, ...bars.map((b) => Math.abs(b.value)));
  const shownValues = [value, ...(estimate !== null ? [estimate] : []), ...(start ? [start.value] : [])];
  const extra = revealExtraLines(lines, shownValues);
  const facts = extra.filter((l) => !l.dim);
  const notes = extra.filter((l) => l.dim);

  const fill0 = useSharedValue(reduced ? 1 : 0);
  const fill1 = useSharedValue(reduced ? 1 : 0);
  const fill2 = useSharedValue(reduced ? 1 : 0);
  const fills = [fill0, fill1, fill2];
  const pill = useSharedValue(reduced ? 1 : 0);

  // Le chiffre est posé : son « reveal », vibration selon l'écart, Val réagit
  const land = useCallback(() => {
    if (landed.current) return;
    landed.current = true;
    feedback.reveal();
    if (!verdict) select();
    else if (verdict.close) success();
    else warning();
    const intro = screen.val.intro;
    if (verdict && intro) setVal({ line: intro.line, mood: verdict.close ? 'fier' : 'alerte' });
  }, [verdict, screen.val.intro, setVal]);

  // Séquence complète, jouée une fois à l'arrivée (useEffectEvent : les
  // valeurs du moment, sans relancer l'effet)
  const play = useEffectEvent((): (() => void) | undefined => {
    // Animations réduites : tout est posé, seule la vibration reste
    if (reduced) {
      land();
      return;
    }
    const later = (ms: number, run: () => void) => timers.current.push(setTimeout(run, ms));
    later(enterDelay + motion.suspense, () => {
      setPhase('roll');
      let begin: number | null = null;
      let ticks = 0;
      let last = -Infinity;
      const tick = (now: number) => {
        if (begin === null) begin = now;
        const progress = Math.min(1, (now - begin) / motion.roll);
        // Au plus une mise à jour toutes les 50 ms (comme useCountUp) : chaque
        // mise à jour est un rendu
        if (progress < 1 && now - last >= COUNT_STEP_MS) {
          last = now;
          setShown(from + (value - from) * easeOut(progress));
        }
        if (progress < 1) {
          const step = Math.floor(progress * ROLL_TICKS);
          if (step > ticks) {
            ticks = step;
            select();
          }
          frame.current = requestAnimationFrame(tick);
          return;
        }
        setShown(value);
        land();
        setPhase('verdict');
      };
      frame.current = requestAnimationFrame(tick);
    });
    const pending = timers.current;
    return () => {
      pending.forEach(clearTimeout);
      cancelAnimationFrame(frame.current);
    };
  });
  useEffect(() => play(), []);

  // Verdict posé : la pastille, puis les barres l'une après l'autre
  const showVerdict = useEffectEvent(() => {
    pill.set(withTiming(1, timing(motion.state)));
    fills.forEach((fill, i) => fill.set(withDelay(motion.state + i * motion.sheet, withTiming(1, timing(motion.max)))));
  });
  useEffect(() => {
    if (phase === 'verdict') showVerdict();
  }, [phase]);

  // Un toucher pendant la séquence : l'état final tout de suite
  const finish = () => {
    if (phase === 'done') return;
    timers.current.forEach(clearTimeout);
    cancelAnimationFrame(frame.current);
    setShown(value);
    land();
    pill.set(1);
    fills.forEach((fill) => fill.set(1));
    setPhase('done');
  };

  const pillStyle = useAnimatedStyle(() => ({
    opacity: pill.get(),
    transform: [{ scale: PILL_FROM + (1 - PILL_FROM) * pill.get() }],
  }));

  const rounded = shown === value ? value : Math.round(shown * 10 ** decimals) / 10 ** decimals;
  const valueText = (n: number) => withUnit(formatNumber(n, decimals), unit);
  // Lignes du détail : un nombre porte l'unité de l'écran (« 2 130 € »), un texte reste tel quel (audit G2)
  const lineText = (v: number | string) => (typeof v === 'number' ? withUnit(formatNumber(v), unit) : v);
  const heading = label ?? 'En vrai';

  return (
    <Pressable
      style={styles.wrap}
      onPress={finish}
      disabled={phase === 'done'}
      accessible={false}
      // Lecteur d'écran : rien à toucher, tout est lu d'un bloc
      importantForAccessibility="no"
    >
      <ScreenIntro screen={screen} size="md" />

      <View style={styles.center}>
        <View
          style={styles.figure}
          accessible
          accessibilityLabel={[
            estimate !== null ? `Ton estimation : ${valueText(estimate)}` : null,
            `${heading} : ${valueText(value)}`,
            verdict?.text,
          ]
            .filter(Boolean)
            .join('. ')}
        >
          <AppText variant="sectionLabel" style={styles.heading}>
            {heading}
          </AppText>
          <BigNumber text={valueText(rounded)} sizingText={widestText([valueText(from), valueText(value)])} size={valueSize} />
          {verdict ? (
            <Animated.View style={[styles.pillWrap, pillStyle]}>
              <Pill
                size="lg"
                label={verdict.text}
                icon={verdict.close ? 'checkmark' : verdict.direction === 'more' ? 'trending-up' : 'trending-down'}
                background={verdict.close ? colors.successSoft : colors.goldSoft}
                color={verdict.close ? colors.success : colors.gold}
              />
            </Animated.View>
          ) : null}
        </View>

        {bars.length > 0 || extra.length > 0 ? (
          <View style={[styles.panel, { backgroundColor: colors.panel }]}>
            {bars.map((bar, i) => (
              <BarRow
                key={bar.key}
                bar={bar}
                ratio={Math.abs(bar.value) / scale}
                fill={fills[i]}
                text={valueText(bar.value)}
              />
            ))}
            {facts.map((line, i) => (
              <View key={`f${i}`} style={styles.fact} accessible>
                <AppText variant="callout" tone={line.key ? 'gold' : 'text'} style={styles.factLabel}>
                  {line.label}
                </AppText>
                <AppText variant="callout" tone={line.key ? 'gold' : 'text'} style={styles.factValue}>
                  {lineText(line.value)}
                </AppText>
              </View>
            ))}
            {/* Lignes atténuées : libellé et valeur, en sous-titre (audit G4) */}
            {notes.map((line, i) => (
              <View key={`n${i}`} style={[styles.fact, styles.note]} accessible>
                <AppText variant="caption" tone="subtitle" style={styles.factLabel}>
                  {line.label}
                </AppText>
                {line.value !== '' ? (
                  <AppText variant="caption" tone="subtitle" style={styles.factValue}>
                    {lineText(line.value)}
                  </AppText>
                ) : null}
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

function BarRow({ bar, ratio, fill, text }: { bar: Bar; ratio: number; fill: SharedValue<number>; text: string }) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const look = {
    start: { ink: colors.subtitle, bar: colors.textFaint },
    guess: { ink: colors.text, bar: colors.subtitle },
    actual: { ink: colors.gold, bar: colors.gold },
  }[bar.tone];
  const fillStyle = useAnimatedStyle(() => ({ width: `${ratio * fill.get() * 100}%` }));

  return (
    <View style={styles.bar} accessible accessibilityLabel={`${bar.label} : ${text}`}>
      <View style={styles.barLegend}>
        <AppText variant="callout" style={[styles.barLabel, { color: look.ink }]}>
          {bar.label}
        </AppText>
        <AppText variant="callout" style={[styles.barLabel, styles.tabular, { color: look.ink }]}>
          {text}
        </AppText>
      </View>
      <View style={[styles.track, { backgroundColor: colors.surface }]}>
        <Animated.View style={[styles.trackFill, { backgroundColor: look.bar }, fillStyle]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    gap: space[6],
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    gap: space[6],
  },
  figure: {
    alignItems: 'center',
  },
  heading: {
    fontFamily: fonts.bodyBold,
    fontSize: LABEL_SIZE,
    lineHeight: LABEL_SIZE + 4,
    letterSpacing: LABEL_SPACING,
    textAlign: 'center',
  },
  pillWrap: {
    marginTop: space[2],
  },
  panel: {
    borderRadius: radius.lg - 2,
    borderCurve: 'continuous',
    paddingHorizontal: space[4] + 2,
    paddingTop: space[1],
    paddingBottom: space[4] + 2,
  },
  bar: {
    marginTop: space[3] + 2,
    gap: space[1] + 2,
  },
  barLegend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: space[3],
  },
  barLabel: {
    fontFamily: fonts.bodySemibold,
    flexShrink: 1,
  },
  tabular: {
    fontVariant: ['tabular-nums'],
  },
  track: {
    height: BAR_HEIGHT,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  trackFill: {
    height: '100%',
    borderRadius: radius.pill,
  },
  fact: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: space[3],
    marginTop: space[3] + 2,
  },
  factLabel: {
    flex: 1,
  },
  factValue: {
    fontFamily: fonts.bodySemibold,
    fontVariant: ['tabular-nums'],
  },
  note: {
    marginTop: space[3] + 2,
  },
});
