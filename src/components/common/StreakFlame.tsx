import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Text from '@/src/components/common/Text';
import Animated, {
  Easing,
  interpolate,
  SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { springs } from '@/src/constants/motion';
import { palette } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { flameTier } from '@/src/utils/discoveryHome';
import { feedback } from '@/src/utils/feedback';
import { celebrate } from '@/src/utils/haptics';
import GoldHalo from './GoldHalo';

// Seul emoji autorisé de l'app (validé) : la flamme de la série
const FLAME = '\u{1F525}';
const OFF_OPACITY = 0.42;
// Vacillement : un aller-retour en 1,2 s
const FLICKER_HALF = 600;
const FLICKER_STRETCH = 0.06;
const FLICKER_SQUEEZE = 0.02;
const FLICKER_ROTATE = 3; // degrés, de part et d'autre
const BREATH_HALF = 1600;
const IGNITE_PEAK = 1.15;
const GROW_PEAK = 1.35;
const GROW_DELAY = 350;
const SPARK_RISE = 900;
const BURST_SPARKS = 8;
const BURST_DURATION = 700;
const HALO_RATIO = 1.5; // règle de GoldHalo : au plus 1,5 fois l'élément

type StreakFlameProps = {
  days: number;
  // Côté du carré de la flamme (la taille de l'emoji en découle, selon le palier)
  size: number;
  // Allumage (accueil, première apparition du jour) : true l'allume, false
  // l'affiche directement, null la cache tant que la réponse n'est pas connue
  ignite?: boolean | null;
  // Série d'avant (fin de leçon) : si elle était plus basse, la flamme grossit,
  // lance une gerbe d'étincelles et vibre
  growFrom?: number;
};

// Flamme de série vivante, à paliers : éteinte (0), petite (1 à 2), avec une
// lueur qui respire (3 à 6), des étincelles (7 à 29), un halo permanent et plus
// d'étincelles (30 et plus). Au repos : vacillement en boucle. Animations
// réduites : flamme fixe à la taille de son palier. Décorative : le parent
// porte le libellé lu.
export default function StreakFlame({ days, size, ignite = false, growFrom }: StreakFlameProps) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const reduced = useReducedMotion();
  const tier = flameTier(days);
  const lit = tier.level > 0;

  const pop = useSharedValue(ignite === null ? 0 : ignite && !reduced ? 0 : 1);
  const flicker = useSharedValue(0);
  const breath = useSharedValue(1);
  // Gerbe d'étincelles : 1 = finie (invisible), relancée de 0 à 1
  const burst = useSharedValue(1);
  const fireBurst = useCallback(() => {
    burst.set(0);
    burst.set(withTiming(1, { duration: BURST_DURATION, easing: Easing.out(Easing.cubic) }));
  }, [burst]);

  const ignited = useRef(false);

  // Allumage, ou flamme qui grossit quand la série augmente
  useEffect(() => {
    if (ignite === null) {
      pop.set(0);
      return;
    }
    const grows = growFrom !== undefined && growFrom < days && lit;
    if (grows) {
      const timer = setTimeout(() => {
        celebrate();
        if (reduced) return;
        fireBurst();
        pop.set(withSequence(withTiming(GROW_PEAK, { duration: 260, easing: Easing.out(Easing.cubic) }), withSpring(1, springs.celebrate)));
      }, GROW_DELAY);
      pop.set(1);
      return () => clearTimeout(timer);
    }
    // Allumage : streak très doux (une fois, même animations réduites)
    if (ignite && lit && !ignited.current) {
      ignited.current = true;
      feedback.ignite();
    }
    if (ignite && lit && !reduced) {
      pop.set(0);
      pop.set(withSequence(withSpring(IGNITE_PEAK, springs.celebrate), withSpring(1, springs.enter)));
      fireBurst();
      return;
    }
    pop.set(1);
  }, [ignite, growFrom, days, lit, reduced, pop, fireBurst]);

  // Vacillement et lueur qui respire, en boucle
  useEffect(() => {
    if (reduced || !lit) {
      flicker.set(0);
      breath.set(1);
      return;
    }
    const half = (duration: number) => ({ duration, easing: Easing.inOut(Easing.sin) });
    flicker.set(withRepeat(withSequence(withTiming(1, half(FLICKER_HALF)), withTiming(0, half(FLICKER_HALF))), -1));
    if (tier.glow) breath.set(withRepeat(withSequence(withTiming(0.55, half(BREATH_HALF)), withTiming(1, half(BREATH_HALF))), -1));
  }, [reduced, lit, tier.glow, flicker, breath]);

  const flameStyle = useAnimatedStyle(() => {
    const f = flicker.get();
    return {
      opacity: pop.get() > 0 ? 1 : 0,
      transform: [
        { scale: pop.get() },
        { scaleY: 1 + FLICKER_STRETCH * f },
        { scaleX: 1 - FLICKER_SQUEEZE * f },
        { rotate: `${(f - 0.5) * 2 * FLICKER_ROTATE}deg` },
      ],
    };
  });
  const glowStyle = useAnimatedStyle(() => ({ opacity: breath.get() * Math.min(1, pop.get()) }));

  const glyph = Math.round(size * tier.scale * 0.8);
  const halo = Math.round(size * HALO_RATIO);

  return (
    <View
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
    >
      {lit && (tier.glow || tier.halo) ? (
        <Animated.View style={[styles.glow, { width: halo, height: halo }, glowStyle]}>
          <GoldHalo />
          {tier.halo ? <GoldHalo /> : null}
        </Animated.View>
      ) : null}

      <Animated.View style={[styles.flame, flameStyle]}>
        {lit ? (
          <Text allowFontScaling={false} style={{ fontSize: glyph, lineHeight: Math.round(glyph * 1.2) }}>
            {FLAME}
          </Text>
        ) : (
          // Éteinte : grise et atténuée (un emoji ne se teinte pas)
          <Ionicons name="flame" size={glyph} color={colors.subtitle} style={{ opacity: OFF_OPACITY }} />
        )}
      </Animated.View>

      {lit && tier.sparkEvery !== null && !reduced ? (
        <SparkLoop size={size} every={tier.sparkEvery} count={tier.level === 4 ? 3 : 2} color={colors.gold} />
      ) : null}
      {lit && !reduced ? <SparkBurst progress={burst} size={size} color={colors.gold} /> : null}
    </View>
  );
}

// Étincelles qui s'échappent de temps en temps, chacune à son rythme
function SparkLoop({ size, every, count, color }: { size: number; every: number; count: number; color: string }) {
  const sparks = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        delay: Math.round(every * (0.6 + 0.8 * ((i * 0.37) % 1))),
        dx: (i % 2 ? 1 : -1) * size * (0.12 + 0.1 * i),
      })),
    [count, every, size]
  );
  return (
    <>
      {sparks.map((s, i) => (
        <LoopSpark key={i} size={size} delay={s.delay} dx={s.dx} color={color} />
      ))}
    </>
  );
}

function LoopSpark({ size, delay, dx, color }: { size: number; delay: number; dx: number; color: string }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.set(withRepeat(withSequence(withDelay(delay, withTiming(1, { duration: SPARK_RISE, easing: Easing.out(Easing.quad) })), withTiming(0, { duration: 0 })), -1));
  }, [p, delay]);
  return <Spark progress={p} size={size} dx={dx} dy={-size * 0.75} color={color} />;
}

// Gerbe d'étincelles, une seule fois (allumage, série qui augmente)
function SparkBurst({ progress, size, color }: { progress: SharedValue<number>; size: number; color: string }) {
  return (
    <>
      {Array.from({ length: BURST_SPARKS }, (_, i) => {
        // Éventail vers le haut, de -150° à -30°
        const angle = ((-150 + (120 * i) / (BURST_SPARKS - 1)) * Math.PI) / 180;
        const reach = size * (0.6 + 0.15 * (i % 3));
        return <Spark key={i} progress={progress} size={size} dx={Math.cos(angle) * reach} dy={Math.sin(angle) * reach} color={color} />;
      })}
    </>
  );
}

function Spark({ progress, size, dx, dy, color }: { progress: SharedValue<number>; size: number; dx: number; dy: number; color: string }) {
  const dot = Math.max(3, Math.round(size * 0.07));
  const style = useAnimatedStyle(() => {
    const t = progress.get();
    return {
      opacity: interpolate(t, [0, 0.15, 1], [0, 1, 0]),
      transform: [{ translateX: dx * t }, { translateY: dy * t }, { scale: 1 - 0.5 * t }],
    };
  });
  return (
    <Animated.View
      style={[
        styles.spark,
        { width: dot, height: dot, borderRadius: dot / 2, backgroundColor: color, top: size * 0.3 },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  glow: {
    position: 'absolute',
  },
  flame: {
    alignItems: 'center',
    justifyContent: 'center',
    transformOrigin: 'bottom',
  },
  spark: {
    position: 'absolute',
  },
});
