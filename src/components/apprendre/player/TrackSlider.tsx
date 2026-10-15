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
import { devFlags } from '@/src/state/devFlags';
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
  // Valeur tenue par l'écran : position au repos (et pot réservoir)
  value: number;
  min: number;
  max: number;
  step: number;
  // Chaque nouveau cran, pendant le glissement (JavaScript n'est prévenu
  // qu'au changement de cran, jamais à chaque image)
  onChange: (value: number) => void;
  // Valeur finale, exacte : fin du glissement, toucher de la piste, action
  // du lecteur d'écran
  onCommit?: (value: number) => void;
  disabled?: boolean;
  // Lecteur d'écran : nom du curseur et valeur lue (« 30 ans »)
  accessibilityLabel: string;
  valueText: string;
  // Piste seule, sans bouton (pot réservoir du répartir)
  readOnly?: boolean;
  size?: keyof typeof SIZES;
  // Petit aller-retour du bouton à l'arrivée, une seule fois, après ce délai
  inviteDelay?: number;
  // Butée propre à l'écran : plus haute valeur permise (le répartir : ce que
  // le réservoir peut céder)
  limit?: number;
  // La butée vient d'être atteinte (une fois par glissement)
  onBlocked?: () => void;
  // Couleur du remplissage et du bouton (or par défaut)
  color?: string;
};

// Curseur en relief du lecteur (pari, simulateur, répartir). On glisse le
// bouton ou on touche la piste pour y sauter. Tout le mouvement vit sur le
// fil d'interface (Reanimated) : le bouton et le remplissage suivent le
// doigt à chaque image sans attendre JavaScript ; le cran est calculé là
// aussi, et JavaScript n'est prévenu qu'au changement de cran. Un cran =
// vibration select() (40 ms d'écart au moins), sans son ; la butée = tick
// grave, une fois par glissement. Au lâcher, le bouton se pose sur son
// cran, un seul tick confirme, et la valeur finale exacte part (onCommit).
// Le geste ne prend que les mouvements horizontaux : un glissement
// clairement vertical fait défiler la page ; pendant le glissement, la page
// ne défile pas (verrou du lecteur). VoiceOver : gestes d'ajustement.
// Seuils du geste : horizontal à partir de 6 px, abandonné au-delà de 12 px
// à la verticale
const ACTIVE_X = 6;
const FAIL_Y = 12;
// Un curseur est-il glissé, côté JavaScript (sans lire le fil d'interface) ?
// Un seul doigt glisse un curseur à la fois.
let jsDragging = false;
function setJsDragging(on: boolean) {
  jsDragging = on;
}
export default function TrackSlider({
  value,
  min,
  max,
  step,
  onChange,
  onCommit,
  disabled,
  accessibilityLabel,
  valueText,
  readOnly,
  size = 'lg',
  inviteDelay,
  limit,
  onBlocked,
  color,
}: TrackSliderProps) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const reduced = useReducedMotion();
  const { track, thumb } = SIZES[size];
  // Piste seule (réservoir) : rien à toucher, juste la place de la piste
  const touchHeight = readOnly ? track + 2 * space[2] : Math.max(thumb + reliefDepth + space[3], sizes.tapMin);
  const interactive = !disabled && !readOnly;
  const ceiling = limit === undefined ? max : Math.max(min, Math.min(max, limit));

  const lockScroll = useScrollLock();
  // Fil d'interface : largeur de la piste, position du bouton (px), cran
  // courant, glissement en cours, butée déjà signalée
  const width = useSharedValue(0);
  const pos = useSharedValue(0);
  const current = useSharedValue(value);
  const dragging = useSharedValue(false);
  const blocked = useSharedValue(false);
  const grow = useSharedValue(1);
  const nudge = useSharedValue(0);

  // Au repos, le bouton suit la valeur de l'écran (pot réservoir, lecteur
  // d'écran) ; pendant un glissement, il ne suit que le doigt
  useEffect(() => {
    if (dragging.get()) return;
    current.set(value);
    const w = width.get();
    pos.set(max > min ? ((value - min) / (max - min)) * w : 0);
  }, [value, min, max, dragging, current, width, pos]);

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

  // JavaScript : un nouveau cran (vibration et son limités, voir feedback.tick)
  const stepped = (next: number) => {
    feedback.sliderStep();
    // Développement : « Sans mises à jour de l'écran pendant le glissement »
    // (l'écran ne suit qu'au lâcher, voir settle)
    if (jsDragging && devFlags.get().noLiveUpdates) return;
    onChange(next);
  };
  const hitLimit = () => {
    feedback.tickBlocked();
    onBlocked?.();
  };
  // Fin du glissement ou toucher : la valeur finale, exacte
  const settle = (final: number) => {
    setJsDragging(false);
    lockScroll(false);
    // Un seul tick discret, pour confirmer
    feedback.sliderRelease();
    onChange(final);
    onCommit?.(final);
  };
  const startDrag = () => {
    setJsDragging(true);
    lockScroll(true);
  };

  // Fil d'interface : cran de la position x, butée comprise. Met à jour le
  // bouton, prévient JavaScript au changement de cran seulement.
  const follow = (x: number) => {
    'worklet';
    const w = width.get();
    if (w <= 0 || max <= min) return;
    const ratio = Math.min(1, Math.max(0, x / w));
    const wanted = Math.min(max, Math.max(min, min + Math.round((ratio * (max - min)) / step) * step));
    const allowed = Math.min(wanted, ceiling);
    const ceilingX = ((ceiling - min) / (max - min)) * w;
    pos.set(Math.min(ratio * w, ceilingX));
    // Butée : signalée une seule fois par glissement (tick grave, vibration)
    if (wanted > ceiling && !blocked.get()) {
      blocked.set(true);
      scheduleOnRN(hitLimit);
      // Petite résistance : le bouton pousse contre la butée et revient
      if (!reduced) nudge.set(withSequence(withTiming(RESIST, timing(motion.tap)), withSpring(0, springs.press)));
    }
    if (allowed !== current.get()) {
      current.set(allowed);
      scheduleOnRN(stepped, allowed);
    }
  };

  // Le bouton se pose sur son cran ; la valeur finale part
  const land = () => {
    'worklet';
    dragging.set(false);
    const w = width.get();
    const x = max > min ? ((current.get() - min) / (max - min)) * w : 0;
    pos.set(reduced ? x : withSpring(x, springs.press));
    grow.set(reduced ? 1 : withSpring(1, springs.press));
    scheduleOnRN(settle, current.get());
  };

  const pan = Gesture.Pan()
    .enabled(interactive)
    .activeOffsetX([-ACTIVE_X, ACTIVE_X])
    .failOffsetY([-FAIL_Y, FAIL_Y])
    .onStart(
      safeGesture((e: { x: number }) => {
        'worklet';
        dragging.set(true);
        blocked.set(false);
        nudge.set(0);
        if (!reduced) grow.set(withTiming(DRAG_SCALE, timing(motion.tap)));
        scheduleOnRN(startDrag);
        follow(e.x);
      })
    )
    .onUpdate(
      safeGesture((e: { x: number }) => {
        'worklet';
        follow(e.x);
      })
    )
    .onFinalize(
      safeGesture(() => {
        'worklet';
        if (dragging.get()) land();
      })
    );
  // Toucher la piste : le bouton y saute
  const tap = Gesture.Tap()
    .enabled(interactive)
    .onEnd(
      safeGesture((e: { x: number }) => {
        'worklet';
        nudge.set(0);
        blocked.set(false);
        dragging.set(true);
        follow(e.x);
        land();
      })
    );
  const gesture = Gesture.Race(pan, tap);

  const onAccessibilityAction = (e: AccessibilityActionEvent) => {
    const base = current.get();
    const delta = e.nativeEvent.actionName === 'increment' ? step : e.nativeEvent.actionName === 'decrement' ? -step : 0;
    if (delta === 0 || !interactive) return;
    const next = Math.min(ceiling, Math.max(min, base + delta));
    if (next === base) {
      if (base + delta > ceiling) hitLimit();
      return;
    }
    current.set(next);
    pos.set(max > min ? ((next - min) / (max - min)) * width.get() : 0);
    stepped(next);
    feedback.sliderRelease();
    onCommit?.(next);
  };

  const ink = color ?? colors.gold;

  const fillStyle = useAnimatedStyle(() => ({ width: pos.get() }));
  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: pos.get() - thumb / 2 + nudge.get() }, { scale: grow.get() }],
  }));

  return (
    // Web : le navigateur garde le défilement vertical, le geste prend l'horizontal
    <GestureDetector gesture={gesture} touchAction="pan-y">
      <View
        style={[styles.touch, { height: touchHeight, marginHorizontal: thumb / 2 }]}
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width;
          width.set(w);
          if (!dragging.get()) pos.set(max > min ? ((current.get() - min) / (max - min)) * w : 0);
        }}
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
          <Animated.View style={[styles.fill, { backgroundColor: ink }, readOnly && styles.passive, fillStyle]} />
        </View>
        {readOnly ? null : (
          <Animated.View
            style={[
              styles.thumb,
              {
                left: 0,
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
