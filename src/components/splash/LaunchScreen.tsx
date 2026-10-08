import { useEffect, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as SplashScreen from 'expo-splash-screen';
import Svg, { Defs, G, Image as SvgImage, LinearGradient, Mask, Rect, Stop } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import { LOGO, LOGO_RATIO } from '@/src/constants/brand';
import { springs } from '@/src/constants/motion';
import { palette, radius } from '@/src/constants/style/Style';
import { useApi } from '@/src/context/ApiContext';
import { useTheme } from '@/src/context/ThemeContext';

const AnimatedRect = Animated.createAnimatedComponent(Rect);

// Logo : 180 de large, comme le splash natif (app.json → imageWidth 180)
const LOGO_WIDTH = 180;
const LOGO_HEIGHT = LOGO_WIDTH / LOGO_RATIO;

// Le splash natif affiche déjà le logo à la même place : on part de cette
// image (opacité 1, échelle 1) pour que la relève soit invisible. Passer à
// false joue l'apparition (opacité 0 → 1, échelle 0,94 → 1, ressort enter),
// utile si le splash natif ne montre que le fond.
const CONTINUES_NATIVE_SPLASH = true;
const APPEAR_FROM_SCALE = 0.94;
const APPEAR_TIME = 350; // fin approximative de l'apparition

// Reflet : bande diagonale (20°), une seule fois, à travers la forme du logo
const SHINE_DURATION = 900;
const SHINE_ANGLE = 20;
const SHINE_BAND = 70;
const SHINE_SKEW = Math.tan((SHINE_ANGLE * Math.PI) / 180) * LOGO_HEIGHT;

// Barre d'attente, si l'app n'est pas prête après l'apparition
const BAR_WIDTH = 120;
const BAR_HEIGHT = 2;
const BAR_GAP = 24;
const SEGMENT_WIDTH = 40;
const BAR_LOOP = 1200;
const PULSE_MIN = 0.35;

const MIN_VISIBLE = 600;
const EXIT_FADE = 250;
// La barre d'attente n'apparaît que si la session tarde (cas rare)
const BAR_DELAY = 1000;
// Au-delà, on laisse place à l'app quoi qu'il arrive
const MAX_WAIT = 3000;

// Prêt = session restaurée localement (polices déjà chargées : l'écran n'est
// monté qu'après). On n'attend AUCUNE donnée réseau : l'app s'affiche tout de
// suite avec ses squelettes, comme les apps bancaires.
// ApiContext pose le token dès sa lecture locale, puis appelle /user en
// réseau avant de passer isLoading à false : un token présent suffit donc
// (isAuthenticated), et sans token il n'y a pas d'appel réseau (!isLoading).
function useAppReady(): boolean {
  const { isLoading, isAuthenticated } = useApi();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), MAX_WAIT);
    return () => clearTimeout(timer);
  }, []);

  return isAuthenticated || !isLoading || timedOut;
}

export default function LaunchScreen({ onFinish }: { onFinish: () => void }) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const reduced = useReducedMotion();
  const ready = useAppReady();

  const appear = !reduced && !CONTINUES_NATIVE_SPLASH;
  const logoOpacity = useSharedValue(appear ? 0 : 1);
  const logoScale = useSharedValue(appear ? APPEAR_FROM_SCALE : 1);
  const shineX = useSharedValue(-SHINE_BAND - SHINE_SKEW);
  const segmentX = useSharedValue(-SEGMENT_WIDTH);
  const barOpacity = useSharedValue(0);
  const screenOpacity = useSharedValue(1);

  const [barDelayPassed, setBarDelayPassed] = useState(false);
  const [minPassed, setMinPassed] = useState(false);
  const [shineDone, setShineDone] = useState(reduced);
  const exiting = useRef(false);

  // Apparition, reflet, durée minimale
  useEffect(() => {
    if (appear) {
      logoOpacity.set(withTiming(1, { duration: APPEAR_TIME }));
      logoScale.set(withSpring(1, springs.enter));
    }
    const timers = [
      setTimeout(() => setBarDelayPassed(true), BAR_DELAY),
      setTimeout(() => setMinPassed(true), MIN_VISIBLE),
    ];
    if (!reduced) {
      const shineStart = appear ? APPEAR_TIME : 0;
      shineX.set(
        withDelay(shineStart, withTiming(LOGO_WIDTH + SHINE_SKEW, { duration: SHINE_DURATION, easing: Easing.inOut(Easing.cubic) }))
      );
      timers.push(setTimeout(() => setShineDone(true), shineStart + SHINE_DURATION));
    }
    return () => timers.forEach(clearTimeout);
  }, [appear, reduced, logoOpacity, logoScale, shineX]);

  // Barre d'attente : seulement si la session n'est pas restaurée après 1 s
  const showBar = barDelayPassed && !ready;
  useEffect(() => {
    if (!showBar) return;
    barOpacity.set(withTiming(1, { duration: 200 }));
    if (reduced) {
      segmentX.set((BAR_WIDTH - SEGMENT_WIDTH) / 2);
      barOpacity.set(withRepeat(withTiming(PULSE_MIN, { duration: 800 }), -1, true));
    } else {
      segmentX.set(withRepeat(withTiming(BAR_WIDTH, { duration: BAR_LOOP, easing: Easing.inOut(Easing.ease) }), -1));
    }
  }, [showBar, reduced, barOpacity, segmentX]);

  // Sortie : app prête, durée minimale passée, reflet terminé → fondu
  useEffect(() => {
    if (!ready || !minPassed || !shineDone || exiting.current) return;
    exiting.current = true;
    screenOpacity.set(
      withTiming(0, { duration: EXIT_FADE }, (finished) => {
        'worklet';
        if (finished) scheduleOnRN(onFinish);
      })
    );
  }, [ready, minPassed, shineDone, screenOpacity, onFinish]);

  const screenStyle = useAnimatedStyle(() => ({ opacity: screenOpacity.get() }));
  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.get(),
    transform: [{ scale: logoScale.get() }],
  }));
  const shineProps = useAnimatedProps(() => ({ x: shineX.get() }));
  const barStyle = useAnimatedStyle(() => ({ opacity: barOpacity.get() }));
  const segmentStyle = useAnimatedStyle(() => ({ transform: [{ translateX: segmentX.get() }] }));

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.screen, { backgroundColor: colors.background }, screenStyle]}
      accessible
      accessibilityLabel="Valtheria, chargement"
      // Relève du splash natif : seulement quand ce logo est réellement affiché
      onLayout={() => {
        SplashScreen.hideAsync().catch(() => {});
      }}
    >
      <Animated.View style={logoStyle}>
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
                <AnimatedRect
                  animatedProps={shineProps}
                  y={0}
                  width={SHINE_BAND}
                  height={LOGO_HEIGHT}
                  fill="url(#logoShine)"
                />
              </G>
            </G>
          ) : null}
        </Svg>
      </Animated.View>

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
