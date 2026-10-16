import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import AppText from '@/src/components/common/AppText';
import { springs, timing } from '@/src/constants/motion';
import { fonts, palette, runBadgeFx, titleLetterSpacing, withOpacity } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';

const SPARK = 5;
// Décalage vertical de chaque étincelle de la traînée (px), pour un effet vivant
const TRAIL_JITTER = [0, -3, 3, -1, 2, -2, 1];
const TRAIL_GAP = 11;
const SHOUT_SIZE = 32;
// Montée du grand texte pendant qu'il s'efface (px)
const SHOUT_RISE = 14;

// Effets de la pastille ⚡ (jamais rendus quand les animations sont
// réduites). Chacun joue une fois, à son montage : le parent les remonte
// avec une nouvelle clé pour les rejouer. Décoratifs : jamais lus.

// Traînée d'étincelles dorées qui parcourt la barre de gauche à droite
export function SparkTrail({ width }: { width: number }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.set(withTiming(1, timing(runBadgeFx.trail)));
  }, [p]);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {Array.from({ length: runBadgeFx.trailSparks }, (_, i) => (
        <TrailSpark key={i} index={i} progress={p} width={width} />
      ))}
    </View>
  );
}

function TrailSpark({ index, progress, width }: { index: number; progress: SharedValue<number>; width: number }) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const lead = index === 0;
  const style = useAnimatedStyle(() => {
    const p = progress.get();
    const x = p * (width + TRAIL_GAP * runBadgeFx.trailSparks) - index * TRAIL_GAP;
    // La tête brille, la queue s'éteint ; tout s'efface à l'arrivée
    const fade = interpolate(p, [0, 0.1, 0.85, 1], [0, 1, 1, 0]);
    return {
      opacity: fade * (1 - index / (runBadgeFx.trailSparks + 1)),
      transform: [{ translateX: x }, { translateY: TRAIL_JITTER[index % TRAIL_JITTER.length] }, { scale: lead ? 1.3 : 1 - index * 0.08 }],
    };
  });
  return <Animated.View style={[styles.spark, styles.trailSpark, { backgroundColor: lead ? colors.ivory : colors.gold }, style]} />;
}

// Gerbe d'étincelles autour de la pastille (paliers 5 et 10)
export function SparkBurst() {
  const p = useSharedValue(0);
  useEffect(() => {
    p.set(withTiming(1, timing(runBadgeFx.burst)));
  }, [p]);
  return (
    <View pointerEvents="none" style={styles.burst} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {Array.from({ length: runBadgeFx.burstSparks }, (_, i) => (
        <BurstSpark key={i} angle={(i / runBadgeFx.burstSparks) * Math.PI * 2} progress={p} index={i} />
      ))}
    </View>
  );
}

function BurstSpark({ angle, progress, index }: { angle: number; progress: SharedValue<number>; index: number }) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  // Une étincelle sur deux va un peu moins loin : la gerbe n'est pas un cercle parfait
  const reach = runBadgeFx.burstReach * (index % 2 === 0 ? 1 : 0.72);
  const style = useAnimatedStyle(() => {
    const p = progress.get();
    return {
      opacity: interpolate(p, [0, 0.15, 1], [0, 1, 0]),
      transform: [
        { translateX: Math.cos(angle) * reach * p },
        { translateY: Math.sin(angle) * reach * p },
        { scale: 1.4 - p * 0.8 },
      ],
    };
  });
  return <Animated.View style={[styles.spark, { backgroundColor: index % 3 === 0 ? colors.ivory : colors.gold }, style]} />;
}

// Grand texte doré sous la barre (« 3 d'affilée ! »), au déclenchement de
// la série et à ses paliers : surgit avec un ressort (0,6 → 1,1 → 1), reste
// 800 ms, puis s'efface en montant. Ne bloque rien : la question reste
// jouable dessous. Animations réduites : apparaît et disparaît sans mouvement.
export function RunShout({ text, reduced }: { text: string; reduced: boolean }) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const scale = useSharedValue(reduced ? 1 : 0.6);
  const opacity = useSharedValue(reduced ? 1 : 0);
  const lift = useSharedValue(0);
  useEffect(() => {
    const hold = runBadgeFx.shoutHold;
    if (reduced) {
      opacity.set(withDelay(hold + runBadgeFx.shoutIn, withTiming(0, { duration: 0 })));
      return;
    }
    opacity.set(withSequence(withTiming(1, timing(runBadgeFx.shoutIn)), withDelay(hold, withTiming(0, timing(runBadgeFx.shoutOut)))));
    scale.set(withSequence(withTiming(1.1, timing(runBadgeFx.shoutIn)), withSpring(1, springs.press)));
    lift.set(withDelay(runBadgeFx.shoutIn + hold, withTiming(-SHOUT_RISE, timing(runBadgeFx.shoutOut))));
  }, [reduced, scale, opacity, lift]);
  const style = useAnimatedStyle(() => ({
    opacity: opacity.get(),
    transform: [{ translateY: lift.get() }, { scale: scale.get() }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.shout, style]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <AppText maxFontSizeMultiplier={1.2} numberOfLines={1} style={[styles.shoutText, { color: colors.gold, textShadowColor: withOpacity(colors.streak, 0.6) }]}>
        {text}
      </AppText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  spark: {
    position: 'absolute',
    width: SPARK,
    height: SPARK,
    borderRadius: SPARK / 2,
  },
  trailSpark: {
    left: 0,
    top: '50%',
    marginTop: -SPARK / 2,
  },
  // Centre de la pastille : les étincelles partent d'ici
  burst: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    marginLeft: -SPARK / 2,
    marginTop: -SPARK / 2,
  },
  shout: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    alignItems: 'center',
  },
  shoutText: {
    fontFamily: fonts.title,
    fontSize: SHOUT_SIZE,
    lineHeight: SHOUT_SIZE + 6,
    letterSpacing: titleLetterSpacing(SHOUT_SIZE),
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
  },
});
