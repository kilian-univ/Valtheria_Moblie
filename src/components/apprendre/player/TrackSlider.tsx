import { useEffect, useRef, useState } from 'react';
import { AccessibilityActionEvent, GestureResponderEvent, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { motion, springs, timing } from '@/src/constants/motion';
import { palette, radius, reliefDepth, size as sizes, space } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { select } from '@/src/utils/haptics';

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
// bouton ou on touche la piste pour y sauter ; un cran franchi = select().
// VoiceOver : gestes d'ajustement (haut / bas).
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

  const [trackWidth, setTrackWidth] = useState(0);
  const trackRef = useRef<View>(null);
  const trackX = useRef(0);
  const trackW = useRef(0);
  // Dernière valeur connue : celle du parent, ou celle qu'on vient d'envoyer
  const last = useRef(value);
  // Butée déjà signalée pendant ce glissement (une seule fois)
  const blocked = useRef(false);
  useEffect(() => {
    last.current = value;
  }, [value]);

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
    if (next !== wanted && !blocked.current) {
      blocked.current = true;
      onBlocked?.();
      // Petite résistance : le bouton pousse contre la butée et revient
      if (!reduced) {
        const push = Math.sign(wanted - next) * RESIST;
        nudge.set(withSequence(withTiming(push, timing(motion.tap)), withSpring(0, springs.press)));
      }
    }
    if (next === wanted) blocked.current = false;
    if (next === last.current) return;
    last.current = next;
    select();
    onChange(next);
  };

  const updateFromPageX = (pageX: number) => {
    if (trackW.current <= 0) return;
    const ratio = Math.min(1, Math.max(0, (pageX - trackX.current) / trackW.current));
    commit(clampToStep(min + ratio * (max - min)));
  };

  const setDragging = (on: boolean) => {
    if (reduced) return;
    grow.set(on ? withTiming(DRAG_SCALE, timing(motion.tap)) : withSpring(1, springs.press));
  };

  // Position de la piste mesurée au toucher : juste même si l'écran a défilé
  const onGrant = (e: GestureResponderEvent) => {
    const { pageX } = e.nativeEvent;
    nudge.set(0);
    blocked.current = false;
    setDragging(true);
    trackRef.current?.measure((_x, _y, width, _h, px) => {
      trackX.current = px;
      trackW.current = width;
      updateFromPageX(pageX);
    });
  };

  const onAccessibilityAction = (e: AccessibilityActionEvent) => {
    blocked.current = false;
    if (e.nativeEvent.actionName === 'increment') commit(clampToStep(last.current + step));
    if (e.nativeEvent.actionName === 'decrement') commit(clampToStep(last.current - step));
  };

  const ink = color ?? colors.gold;
  const ratio = max > min ? Math.min(1, Math.max(0, (value - min) / (max - min))) : 0;
  const fillWidth = ratio * trackWidth;

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: nudge.get() }, { scale: grow.get() }],
  }));

  return (
    <View
      ref={trackRef}
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
      onStartShouldSetResponder={() => interactive}
      onMoveShouldSetResponder={() => interactive}
      // Le défilement vertical ne vole pas le curseur en cours de glissé
      onResponderTerminationRequest={() => false}
      onResponderGrant={onGrant}
      onResponderMove={(e) => updateFromPageX(e.nativeEvent.pageX)}
      onResponderRelease={() => setDragging(false)}
      onResponderTerminate={() => setDragging(false)}
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
