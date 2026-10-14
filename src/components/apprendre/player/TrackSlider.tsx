import { useEffect, useState } from 'react';
import { AccessibilityActionEvent, StyleSheet, View } from 'react-native';
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
import { scheduleOnRN } from 'react-native-worklets';

import { motion, springs, timing } from '@/src/constants/motion';
import { palette, radius, reliefDepth, size as sizes, space } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { safeGesture } from '@/src/utils/gestureSafety';
import { feedback } from '@/src/utils/feedback';
import { useScrollLock } from './ScrollLock';

// lg : pari et simulateur (piste de 10, bouton de 36) ; md : lignes
// compactes du répartir
const SIZES = {
  lg: { track: 10, thumb: 36 },
  md: { track: 8, thumb: 28 },
} as const;
const THUMB_BORDER = 3;
// Le bouton grossit légèrement pendant le glissement
const DRAG_SCALE = 1.15;
// Aller-retour d'invitation, à l'arrivée (px)
const INVITE_OUT = 14;
const INVITE_BACK = -6;
// Butée : le bouton force un peu contre elle, puis revient
const RESIST = 6;

type TrackSliderProps = {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  // Lecteur d'écran : nom du curseur et valeur lue (« 30 ans »)
  accessibilityLabel: string;
  valueText: string;
  // Piste seule, sans bouton (pot réservoir du répartir)
  readOnly?: boolean;
  size?: keyof typeof SIZES;
  // Petit aller-retour du bouton à l'arrivée, une seule fois, après ce délai
  inviteDelay?: number;
  // Limite propre à l'écran (butée) : valeur permise pour une valeur voulue
  clamp?: (value: number) => number;
  // La butée vient d'être atteinte (une fois par glissement)
  onBlocked?: () => void;
  // Couleur du remplissage et du bouton (or par défaut)
  color?: string;
};

// Curseur en relief du lecteur (pari, simulateur, répartir). On glisse le
// bouton ou on touche la piste pour y sauter ; un cran franchi = vibration
// select() et son « tick » (plus aigu vers la droite, 60 ms d'écart au
// moins) ; la butée = « tick » plus grave.
// Le geste ne prend que les mouvements horizontaux : un glissement
// clairement vertical fait défiler la page ; pendant le glissement, la page
// ne défile pas (verrou du lecteur). VoiceOver : gestes d'ajustement.
// Seuils du geste : horizontal à partir de 6 px, abandonné au-delà de 12 px
// à la verticale
const ACTIVE_X = 6;
const FAIL_Y = 12;
export default function TrackSlider({
  value,
  min,
  max,
  step,
  onChange,
  disabled,
  accessibilityLabel,
  valueText,
  readOnly,
  size = 'lg',
  inviteDelay,
  clamp,
  onBlocked,
  color,
}: TrackSliderProps) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const reduced = useReducedMotion();
  const { track, thumb } = SIZES[size];
  // Piste seule (réservoir) : rien à toucher, juste la place de la piste
  const touchHeight = readOnly ? track + 2 * space[2] : Math.max(thumb + reliefDepth + space[3], sizes.tapMin);

  const lockScroll = useScrollLock();
  const [trackWidth, setTrackWidth] = useState(0);
  // Dernière valeur connue : celle du parent, ou celle qu'on vient d'envoyer
  const last = useSharedValue(value);
  // Butée déjà signalée pendant ce glissement (une seule fois)
  const blocked = useSharedValue(false);
  useEffect(() => {
    last.set(value);
  }, [value, last]);

  const grow = useSharedValue(1);
  const nudge = useSharedValue(0);

  const interactive = !disabled && !readOnly;

  // Invitation : le bouton fait un petit aller-retour, une seule fois
  const [invite] = useState(inviteDelay !== undefined && !reduced && interactive);
  useEffect(() => {
    if (!invite) return;
    nudge.set(
      withDelay(
        inviteDelay ?? 0,
        withSequence(
          withTiming(INVITE_OUT, timing(motion.sheet)),
          withTiming(INVITE_BACK, timing(motion.state)),
          withSpring(0, springs.press)
        )
      )
    );
  }, [invite, inviteDelay, nudge]);

  const clampToStep = (raw: number) => {
    const stepped = min + Math.round((raw - min) / step) * step;
    return Math.min(max, Math.max(min, stepped));
  };

  const commit = (wanted: number) => {
    if (!interactive) return;
    const next = clamp ? clamp(wanted) : wanted;
    if (next !== wanted && !blocked.get()) {
      blocked.set(true);
      feedback.tickBlocked();
      onBlocked?.();
      // Petite résistance : le bouton pousse contre la butée et revient
      if (!reduced) {
        const push = Math.sign(wanted - next) * RESIST;
        nudge.set(withSequence(withTiming(push, timing(motion.tap)), withSpring(0, springs.press)));
      }
    }
    if (next === wanted) blocked.set(false);
    if (next === last.get()) return;
    last.set(next);
    feedback.tick(max > min ? (next - min) / (max - min) : 0);
    onChange(next);
  };

  // x : position du doigt sur la piste (repère du geste)
  const updateFromX = (x: number) => {
    if (trackWidth <= 0) return;
    const ratio = Math.min(1, Math.max(0, x / trackWidth));
    commit(clampToStep(min + ratio * (max - min)));
  };

  const setDragging = (on: boolean) => {
    lockScroll(on);
    if (reduced) return;
    grow.set(on ? withTiming(DRAG_SCALE, timing(motion.tap)) : withSpring(1, springs.press));
  };

  const begin = (x: number) => {
    nudge.set(0);
    blocked.set(false);
    setDragging(true);
    updateFromX(x);
  };

  const jump = (x: number) => {
    nudge.set(0);
    blocked.set(false);
    updateFromX(x);
  };

  const pan = Gesture.Pan()
    .enabled(interactive)
    .activeOffsetX([-ACTIVE_X, ACTIVE_X])
    .failOffsetY([-FAIL_Y, FAIL_Y])
    .onStart(
      safeGesture((e: { x: number }) => {
        'worklet';
        scheduleOnRN(begin, e.x);
      })
    )
    .onUpdate(
      safeGesture((e: { x: number }) => {
        'worklet';
        scheduleOnRN(updateFromX, e.x);
      })
    )
    .onFinalize(
      safeGesture(() => {
        'worklet';
        scheduleOnRN(setDragging, false);
      })
    );
  // Toucher la piste : le bouton y saute
  const tap = Gesture.Tap()
    .enabled(interactive)
    .onEnd(
      safeGesture((e: { x: number }) => {
        'worklet';
        scheduleOnRN(jump, e.x);
      })
    );
  const gesture = Gesture.Race(pan, tap);

  const onAccessibilityAction = (e: AccessibilityActionEvent) => {
    blocked.set(false);
    if (e.nativeEvent.actionName === 'increment') commit(clampToStep(last.get() + step));
    if (e.nativeEvent.actionName === 'decrement') commit(clampToStep(last.get() - step));
  };

  const ink = color ?? colors.gold;
  const ratio = max > min ? Math.min(1, Math.max(0, (value - min) / (max - min))) : 0;
  const fillWidth = ratio * trackWidth;

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: nudge.get() }, { scale: grow.get() }],
  }));

  return (
    // Web : le navigateur garde le défilement vertical, le geste prend l'horizontal
    <GestureDetector gesture={gesture} touchAction="pan-y">
      <View
        style={[styles.touch, { height: touchHeight, marginHorizontal: thumb / 2 }]}
        onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
        accessible
        accessibilityRole={readOnly ? undefined : 'adjustable'}
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled: !interactive }}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={valueText}
        accessibilityActions={interactive ? [{ name: 'increment' }, { name: 'decrement' }] : undefined}
        onAccessibilityAction={onAccessibilityAction}
      >
        {/* Une piste à 0 % reste visible */}
        <View style={[styles.track, { height: track, backgroundColor: colors.surface }]} pointerEvents="none">
          <View style={[styles.fill, { width: fillWidth, backgroundColor: ink }, readOnly && styles.passive]} />
        </View>
        {readOnly ? null : (
          <Animated.View
            style={[
              styles.thumb,
              {
                left: fillWidth - thumb / 2,
                top: (touchHeight - thumb) / 2 - reliefDepth / 2,
                width: thumb,
                height: thumb + reliefDepth,
              },
              thumbStyle,
            ]}
            pointerEvents="none"
          >
            <View style={[styles.round, { top: reliefDepth, width: thumb, height: thumb, backgroundColor: colors.goldDeep }]} />
            <View
              style={[
                styles.round,
                styles.face,
                { width: thumb, height: thumb, backgroundColor: ink, borderColor: colors.background },
              ]}
            />
          </Animated.View>
        )}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  // Une demi-poignée de marge de chaque côté : le bouton reste dans l'écran
  touch: {
    justifyContent: 'center',
  },
  track: {
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.pill,
  },
  // Pot réservoir : il suit les autres, sans bouton
  passive: {
    opacity: 0.6,
  },
  thumb: {
    position: 'absolute',
  },
  round: {
    position: 'absolute',
    borderRadius: radius.pill,
  },
  face: {
    top: 0,
    borderWidth: THUMB_BORDER,
  },
});
