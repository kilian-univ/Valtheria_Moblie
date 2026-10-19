import { LinearGradient } from 'expo-linear-gradient';
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import { DimensionValue, StyleProp, StyleSheet, useWindowDimensions, View, ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  FadeOut,
  SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { durations } from '@/src/constants/motion';
import { palette, radius as radii } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';

// --- Reflet partagé ----------------------------------------------------------
// Une seule animation pour toute l'app : une bande diagonale traverse l'écran
// de gauche à droite (1 200 ms), puis une pause (400 ms), en boucle. Chaque
// bloc affiche la portion de la bande qui passe à sa position à l'écran : on
// voit un seul reflet glisser sur tous les blocs en même temps.
const ANGLE_DEG = 20;
const TAN = Math.tan((ANGLE_DEG * Math.PI) / 180);
const SWEEP = durations.shimmer;
const PAUSE = 400;
const BAND_RATIO = 0.6; // largeur de la bande : 60 % de l'écran
// Animations réduites : pas de reflet, pulsation douce de l'opacité
const PULSE_MIN = 0.7;
const PULSE_HALF = 800; // 1 → 0,7 → 1 en 1 600 ms

type SkeletonContextValue = {
  progress: SharedValue<number>;
  pulse: SharedValue<number>;
  reduced: boolean;
  register: () => () => void;
};

const SkeletonContext = createContext<SkeletonContextValue | null>(null);

// À poser une fois, à la racine de l'app. L'animation ne tourne que tant
// qu'au moins un bloc de squelette est affiché.
export function SkeletonProvider({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  const progress = useSharedValue(0);
  const pulse = useSharedValue(1);
  const mounted = useRef(0);

  const start = useCallback(() => {
    if (reduced) {
      pulse.set(withRepeat(withTiming(PULSE_MIN, { duration: PULSE_HALF, easing: Easing.inOut(Easing.ease) }), -1, true));
      return;
    }
    progress.set(
      withRepeat(
        withSequence(
          withTiming(0, { duration: 0 }),
          withTiming(1, { duration: SWEEP, easing: Easing.linear }),
          withTiming(1, { duration: PAUSE })
        ),
        -1
      )
    );
  }, [reduced, progress, pulse]);

  const stop = useCallback(() => {
    cancelAnimation(progress);
    cancelAnimation(pulse);
    progress.set(0);
    pulse.set(1);
  }, [progress, pulse]);

  const register = useCallback(() => {
    mounted.current += 1;
    if (mounted.current === 1) start();
    return () => {
      mounted.current -= 1;
      if (mounted.current === 0) stop();
    };
  }, [start, stop]);

  const value = useMemo(() => ({ progress, pulse, reduced, register }), [progress, pulse, reduced, register]);

  return <SkeletonContext.Provider value={value}>{children}</SkeletonContext.Provider>;
}

// --- Bloc ---------------------------------------------------------------------
// text : ligne de texte (rayon sm) · button : bouton (rayon md)
// circle : avatar, anneau (rond) · block : grand bloc (rayon lg) · pill : pastille
export type SkeletonShape = 'text' | 'button' | 'circle' | 'block' | 'pill';

type SkeletonProps = {
  width: DimensionValue;
  height: number;
  shape?: SkeletonShape;
  style?: StyleProp<ViewStyle>;
};

function shapeRadius(shape: SkeletonShape, height: number): number {
  switch (shape) {
    case 'button':
      return radii.md;
    case 'circle':
      return height / 2;
    case 'block':
      return radii.lg;
    case 'pill':
      return radii.pill;
    default:
      return radii.sm;
  }
}

export default function Skeleton({ width, height, shape = 'text', style }: SkeletonProps) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const ctx = useContext(SkeletonContext);
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const bandWidth = screenWidth * BAND_RATIO;

  // Position du bloc à l'écran, mesurée après la mise en page
  const ref = useRef<View>(null);
  const blockX = useSharedValue(0);
  const blockY = useSharedValue(0);
  const blockH = useSharedValue(height);
  const measured = useSharedValue(0);

  const register = ctx?.register;
  useEffect(() => (register ? register() : undefined), [register]);

  const onLayout = () => {
    ref.current?.measureInWindow((x, y, _w, h) => {
      blockX.set(x);
      blockY.set(y);
      blockH.set(h);
      measured.set(1);
    });
  };

  const progress = ctx?.progress;
  const pulse = ctx?.pulse;
  const showShine = !!ctx && !ctx.reduced;

  // Bord gauche de la bande à l'écran : x = X(t) + y × tan(20°). On part assez
  // à gauche pour que même les blocs du bas d'écran voient la bande entrer.
  const shineStyle = useAnimatedStyle(() => {
    if (!progress) return { opacity: 0 };
    const from = -bandWidth - screenHeight * TAN;
    const x = from + progress.get() * (screenWidth - from);
    const centerY = blockY.get() + blockH.get() / 2;
    return {
      opacity: measured.get(),
      transform: [{ translateX: x + centerY * TAN - blockX.get() }, { skewX: `${ANGLE_DEG}deg` }],
    };
  });

  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulse ? pulse.get() : 1 }));

  return (
    <Animated.View
      ref={ref}
      onLayout={onLayout}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.block,
        { width, height, borderRadius: shapeRadius(shape, height), backgroundColor: colors.surface },
        style,
        pulseStyle,
      ]}
    >
      {showShine ? (
        <Animated.View style={[styles.band, { width: bandWidth }, shineStyle]} pointerEvents="none">
          <LinearGradient
            colors={['transparent', colors.skeletonShine, 'transparent']}
            locations={[0, 0.5, 1]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

// Groupe de blocs : à l'arrivée des données, il s'efface en fondu (200 ms)
// pendant que le contenu apparaît. Animations réduites : il disparaît d'un coup.
export function SkeletonGroup({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <Animated.View exiting={FadeOut.duration(durations.fade)} style={style}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  block: {
    overflow: 'hidden',
    borderCurve: 'continuous',
  },
  band: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
  },
});
