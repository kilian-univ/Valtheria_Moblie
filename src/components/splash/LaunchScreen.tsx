import { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, G, Image as SvgImage, LinearGradient, Mask, Rect, Stop } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import { LOGO, LOGO_RATIO } from '@/src/constants/brand';
import { durations } from '@/src/constants/motion';
import { palette, radius } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';

const AnimatedRect = Animated.createAnimatedComponent(Rect);

// Écran de session lente uniquement (voir StartupGate) : posé par-dessus le
// splash natif, logo à la même taille et au même endroit (app.json →
// imageWidth 180), sans apparition : la relève est invisible.
const LOGO_WIDTH = 180;
const LOGO_HEIGHT = LOGO_WIDTH / LOGO_RATIO;

// Reflet : bande diagonale (20°), une fois, à travers la forme du logo
const SHINE_DURATION = 900;
const SHINE_ANGLE = 20;
const SHINE_BAND = 70;
const SHINE_SKEW = Math.tan((SHINE_ANGLE * Math.PI) / 180) * LOGO_HEIGHT;

// Barre d'attente
const BAR_WIDTH = 120;
const BAR_HEIGHT = 2;
const BAR_GAP = 24;
const SEGMENT_WIDTH = 40;
const BAR_LOOP = 1200;
const PULSE_MIN = 0.35;

type LaunchScreenProps = {
  ready: boolean;
  // Le logo animé est affiché : le splash natif peut se masquer
  onShown: () => void;
  // Fondu de sortie terminé
  onFinish: () => void;
};

export default function LaunchScreen({ ready, onShown, onFinish }: LaunchScreenProps) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const reduced = useReducedMotion();

  const shineX = useSharedValue(-SHINE_BAND - SHINE_SKEW);
  const segmentX = useSharedValue(reduced ? (BAR_WIDTH - SEGMENT_WIDTH) / 2 : -SEGMENT_WIDTH);
  const barOpacity = useSharedValue(0);
  const screenOpacity = useSharedValue(1);
  const exiting = useRef(false);

  // Reflet une fois, barre d'attente tout de suite (on est déjà au-delà d'1 s)
  useEffect(() => {
    barOpacity.set(withTiming(1, { duration: durations.fade }));
    if (reduced) {
      barOpacity.set(withRepeat(withTiming(PULSE_MIN, { duration: 800 }), -1, true));
      return;
    }
    shineX.set(withTiming(LOGO_WIDTH + SHINE_SKEW, { duration: SHINE_DURATION, easing: Easing.inOut(Easing.cubic) }));
    segmentX.set(withRepeat(withTiming(BAR_WIDTH, { duration: BAR_LOOP, easing: Easing.inOut(Easing.ease) }), -1));
  }, [reduced, barOpacity, shineX, segmentX]);

  // App prête : fondu de 200 ms, sans attendre la fin du reflet
  useEffect(() => {
    if (!ready || exiting.current) return;
    exiting.current = true;
    screenOpacity.set(
      withTiming(0, { duration: durations.fade }, (finished) => {
        'worklet';
        if (finished) scheduleOnRN(onFinish);
      })
    );
  }, [ready, screenOpacity, onFinish]);

  const screenStyle = useAnimatedStyle(() => ({ opacity: screenOpacity.get() }));
  const shineProps = useAnimatedProps(() => ({ x: shineX.get() }));
  const barStyle = useAnimatedStyle(() => ({ opacity: barOpacity.get() }));
  const segmentStyle = useAnimatedStyle(() => ({ transform: [{ translateX: segmentX.get() }] }));

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.screen, { backgroundColor: colors.background }, screenStyle]}
      accessible
      accessibilityLabel="Valtheria, chargement"
      onLayout={onShown}
    >
      <Svg width={LOGO_WIDTH} height={LOGO_HEIGHT}>
        <Defs>
          {/* Le reflet n'est visible qu'à travers la forme du logo */}
          <Mask id="logoMask" maskType="alpha" maskUnits="userSpaceOnUse" x="0" y="0" width={LOGO_WIDTH} height={LOGO_HEIGHT}>
            <SvgImage href={LOGO} width={LOGO_WIDTH} height={LOGO_HEIGHT} />
          </Mask>
          <LinearGradient id="logoShine" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={colors.logoShine} stopOpacity={0} />
            <Stop offset="0.5" stopColor={colors.logoShine} stopOpacity={1} />
            <Stop offset="1" stopColor={colors.logoShine} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <SvgImage href={LOGO} width={LOGO_WIDTH} height={LOGO_HEIGHT} />
        {!reduced ? (
          <G mask="url(#logoMask)">
            {/* Bande inclinée de 20° : le cisaillement décale le haut vers la gauche */}
            <G transform={`skewX(-${SHINE_ANGLE})`}>
              <AnimatedRect animatedProps={shineProps} y={0} width={SHINE_BAND} height={LOGO_HEIGHT} fill="url(#logoShine)" />
            </G>
          </G>
        ) : null}
      </Svg>

      <Animated.View style={[styles.bar, { backgroundColor: colors.surface }, barStyle]}>
        <Animated.View style={[styles.segment, { backgroundColor: colors.gold }, segmentStyle]} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  bar: {
    position: 'absolute',
    top: '50%',
    marginTop: LOGO_HEIGHT / 2 + BAR_GAP,
    width: BAR_WIDTH,
    height: BAR_HEIGHT,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  segment: {
    width: SEGMENT_WIDTH,
    height: BAR_HEIGHT,
    borderRadius: radius.pill,
  },
});
