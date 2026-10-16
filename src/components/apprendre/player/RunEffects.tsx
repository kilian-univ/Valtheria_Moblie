import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import AppText from '@/src/components/common/AppText';
import { timing } from '@/src/constants/motion';
import { fonts, palette, runBadgeFx, withOpacity } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';

const SPARK = 5;
// Décalage vertical de chaque étincelle de la traînée (px), pour un effet vivant
const TRAIL_JITTER = [0, -3, 3, -1, 2, -2, 1];
const TRAIL_GAP = 11;
const WORD_BOX = 120;
// Marge du haut à partir de laquelle il y a de la place au-dessus de la barre (encoche)
const ROOMY_TOP_INSET = 30;

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

// Mot bref au-dessus de la pastille (« En feu ! »), qui apparaît puis
// s'efface. Sans encoche (iPhone SE), la barre d'état est collée à la barre
// du lecteur : le mot passe juste sous la pastille, pour ne pas couvrir
// l'heure ni la batterie.
export function RunWord({ word }: { word: string }) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const above = useSafeAreaInsets().top >= ROOMY_TOP_INSET;
  const p = useSharedValue(0);
  useEffect(() => {
    const third = runBadgeFx.word / 3;
    p.set(withSequence(withTiming(1, timing(third)), withTiming(1, { duration: third }), withTiming(2, timing(third))));
  }, [p]);
  const style = useAnimatedStyle(() => {
    const v = p.get();
    return {
      opacity: interpolate(v, [0, 1, 2], [0, 1, 0]),
      transform: [{ translateY: interpolate(v, [0, 1, 2], [4, 0, -6]) }, { scale: interpolate(v, [0, 1], [0.8, 1], 'clamp') }],
    };
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.word, above ? styles.wordAbove : styles.wordBelow, style]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View style={[styles.wordBubble, { backgroundColor: withOpacity(colors.background, 0.85) }]}>
        <AppText maxFontSizeMultiplier={1.2} numberOfLines={1} style={[styles.wordText, { color: colors.gold }]}>
          {word}
        </AppText>
      </View>
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
  // Largeur fixe, calé à droite : le mot ne se coupe jamais sur la pastille étroite
  word: {
    position: 'absolute',
    right: 0,
    width: WORD_BOX,
    alignItems: 'flex-end',
  },
  wordAbove: {
    bottom: '100%',
    marginBottom: 2,
  },
  wordBelow: {
    top: '100%',
    marginTop: 4,
  },
  wordBubble: {
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  wordText: {
    fontFamily: fonts.bodyExtraBold,
    fontSize: 12,
    lineHeight: 15,
  },
});
