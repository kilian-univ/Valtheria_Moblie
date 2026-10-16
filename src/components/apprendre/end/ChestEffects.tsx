import { LinearGradient } from 'expo-linear-gradient';
import { ReactNode, useEffect, useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, FeGaussianBlur, Filter, G, Path, RadialGradient, Stop } from 'react-native-svg';

import GoldHalo from '@/src/components/common/GoldHalo';
import ValsCoin from '@/src/components/common/ValsCoin';
import { palette, withOpacity } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { CHEST_FOUNTAIN_MS } from '@/src/utils/chestTimeline';

// Effets du coffre (ChestReveal). Tous décoratifs : jamais lus.

// ---------------------------------------------------------------------------
// Anticipation : la lumière filtre par les fentes du couvercle
// ---------------------------------------------------------------------------

// Fente entre couvercle et coffre, en part de la hauteur de l'image
const SEAM_Y = 0.43;
const SEAM_WIDTH = 0.62;
// Fines lignes floues le long de la fente : décalage vertical, largeur, épaisseur
const SEAM_LINES = [
  { dy: 0, width: 1, thick: 12, alpha: 0.95 },
  { dy: -5, width: 0.7, thick: 6, alpha: 0.7 },
  { dy: 5, width: 0.5, thick: 5, alpha: 0.55 },
];
// Rais qui s'échappent vers le haut : angle (degrés), hauteur, départ le long de la fente
const LEAK_BEAMS = [
  { angle: -28, height: 46, x: 0.22 },
  { angle: -10, height: 58, x: 0.4 },
  { angle: 6, height: 52, x: 0.58 },
  { angle: 24, height: 44, x: 0.78 },
];

export function LidLight({ size, color, progress }: { size: number; color: string; progress: SharedValue<number> }) {
  const style = useAnimatedStyle(() => ({ opacity: progress.get() }));
  const seamWidth = size * SEAM_WIDTH;
  const left = (size - seamWidth) / 2;
  const top = size * SEAM_Y;
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, style]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {LEAK_BEAMS.map((b, i) => (
        <View
          key={`b${i}`}
          style={{
            position: 'absolute',
            left: left + seamWidth * b.x - 2,
            top: top - b.height,
            width: 4,
            height: b.height,
            transformOrigin: ['50%', '100%', 0],
            transform: [{ rotate: `${b.angle}deg` }],
          }}
        >
          <LinearGradient colors={[withOpacity(color, 0), withOpacity(color, 0.75)]} style={[StyleSheet.absoluteFill, styles.round]} />
        </View>
      ))}
      {SEAM_LINES.map((l, i) => (
        <View
          key={`l${i}`}
          style={{
            position: 'absolute',
            left: left + (seamWidth * (1 - l.width)) / 2,
            top: top + l.dy - l.thick / 2,
            width: seamWidth * l.width,
            height: l.thick,
          }}
        >
          {/* Floue : transparente en haut et en bas, et vers les deux bouts */}
          <LinearGradient
            colors={[withOpacity(color, 0), withOpacity(color, l.alpha), withOpacity(color, 0)]}
            style={[StyleSheet.absoluteFill, styles.round]}
          />
          <LinearGradient
            colors={[withOpacity(color, 0), withOpacity(color, l.alpha * 0.8), withOpacity(color, 0)]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={[StyleSheet.absoluteFill, styles.round]}
          />
        </View>
      ))}
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Moment fort : gerbe de pièces et d'étincelles qui jaillit en arc et retombe
// ---------------------------------------------------------------------------

const GRAVITY = 1150; // px/s²
// Vitesses de départ (px/s), rotation des pièces (tours), taille : une table
// fixe, la gerbe est la même à chaque fois
const COINS = [
  { vx: -170, vy: -560, spin: 1.2, size: 26 },
  { vx: -95, vy: -640, spin: -0.8, size: 22 },
  { vx: -30, vy: -700, spin: 1.5, size: 28 },
  { vx: 40, vy: -660, spin: -1.1, size: 24 },
  { vx: 110, vy: -600, spin: 0.9, size: 26 },
  { vx: 185, vy: -520, spin: -1.4, size: 20 },
  { vx: -140, vy: -470, spin: 0.7, size: 18 },
  { vx: 150, vy: -450, spin: -0.6, size: 18 },
  { vx: 5, vy: -540, spin: 1, size: 20 },
];
const SPARKS = [
  { vx: -210, vy: -500 },
  { vx: -150, vy: -620 },
  { vx: -70, vy: -720 },
  { vx: 0, vy: -760 },
  { vx: 75, vy: -700 },
  { vx: 150, vy: -630 },
  { vx: 215, vy: -510 },
  { vx: -45, vy: -580 },
  { vx: 55, vy: -560 },
  { vx: 120, vy: -480 },
];
const SPARK = 6;

export function ChestFountain({ originY }: { originY: number }) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const p = useSharedValue(0);
  useEffect(() => {
    p.set(withTiming(1, { duration: CHEST_FOUNTAIN_MS, easing: Easing.linear }));
  }, [p]);
  return (
    <View
      pointerEvents="none"
      style={[styles.origin, { top: originY }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {SPARKS.map((s, i) => (
        <Particle key={`s${i}`} progress={p} vx={s.vx} vy={s.vy} spin={0} size={SPARK}>
          <View style={[styles.spark, { backgroundColor: i % 3 === 0 ? colors.ivory : colors.gold }]} />
        </Particle>
      ))}
      {COINS.map((c, i) => (
        <Particle key={`c${i}`} progress={p} vx={c.vx} vy={c.vy} spin={c.spin} size={c.size}>
          <ValsCoin size={c.size} />
        </Particle>
      ))}
    </View>
  );
}

function Particle({
  progress,
  vx,
  vy,
  spin,
  size,
  children,
}: {
  progress: SharedValue<number>;
  vx: number;
  vy: number;
  spin: number;
  size: number;
  children: ReactNode;
}) {
  const style = useAnimatedStyle(() => {
    const p = progress.get();
    const t = (p * CHEST_FOUNTAIN_MS) / 1000;
    // Arc vers le haut, puis chute ; s'estompe sur la fin
    const x = vx * t;
    const y = vy * t + 0.5 * GRAVITY * t * t;
    const fade = p < 0.6 ? 1 : Math.max(0, 1 - (p - 0.6) / 0.4);
    return {
      opacity: p === 0 ? 0 : fade,
      transform: [{ translateX: x - size / 2 }, { translateY: y - size / 2 }, { rotate: `${spin * 360 * p}deg` }],
    };
  });
  return <Animated.View style={[styles.particle, style]}>{children}</Animated.View>;
}

// ---------------------------------------------------------------------------
// Retombée : halo qui respire et rayons flous qui tournent très lentement
// ---------------------------------------------------------------------------

const RAY_COUNT = 7;
// Chaque rayon : deux couches larges et pâles, puis tout est flouté (flou
// gaussien) : des faisceaux de lumière fondus, sans aucune forme de barre ;
// demi-angle (degrés), opacité
const RAY_LAYERS = [
  { half: 12, alpha: 0.24 },
  { half: 5.5, alpha: 0.34 },
];
const RAY_BLUR = 7;
// Un tour en 20 s
const RAY_TURN_MS = 20000;
const BREATH_MS = 3200;
const BREATH_SCALE = 1.08;

function wedge(c: number, r: number, angleDeg: number, halfDeg: number): string {
  const a = ((angleDeg - halfDeg) * Math.PI) / 180;
  const b = ((angleDeg + halfDeg) * Math.PI) / 180;
  const x1 = c + r * Math.cos(a);
  const y1 = c + r * Math.sin(a);
  const x2 = c + r * Math.cos(b);
  const y2 = c + r * Math.sin(b);
  return `M ${c} ${c} L ${x1.toFixed(1)} ${y1.toFixed(1)} A ${r} ${r} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)} Z`;
}

// Lumière douce de la rareté : un halo radial qui respire et des rayons
// fondus qui tournent lentement. still : figés (animations réduites).
export function ChestLight({ size, color, strength, still }: { size: number; color: string; strength: number; still: boolean }) {
  const id = `r${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const blurId = `${id}b`;
  const turn = useSharedValue(0);
  const breath = useSharedValue(1);
  useEffect(() => {
    if (still) return;
    turn.set(withRepeat(withTiming(360, { duration: RAY_TURN_MS, easing: Easing.linear }), -1));
    const half = { duration: BREATH_MS / 2, easing: Easing.inOut(Easing.sin) };
    breath.set(withRepeat(withSequence(withTiming(BREATH_SCALE, half), withTiming(1, half)), -1));
  }, [still, turn, breath]);
  const raysStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.get()}deg` }] }));
  const haloStyle = useAnimatedStyle(() => ({ transform: [{ scale: breath.get() }] }));
  const c = size / 2;

  return (
    <View pointerEvents="none" style={[styles.light, { width: size, height: size }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Animated.View style={[StyleSheet.absoluteFill, raysStyle]}>
        <Svg width={size} height={size}>
          <Defs>
            {/* Fondu le long du rayon : rien au cœur (derrière le coffre), clair au milieu, éteint au bord */}
            <RadialGradient id={id} cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
              <Stop offset="0" stopColor={color} stopOpacity={0} />
              <Stop offset="0.14" stopColor={color} stopOpacity={0} />
              <Stop offset="0.3" stopColor={color} stopOpacity={strength} />
              <Stop offset="0.65" stopColor={color} stopOpacity={strength * 0.45} />
              <Stop offset="1" stopColor={color} stopOpacity={0} />
            </RadialGradient>
            <Filter id={blurId} x="-20%" y="-20%" width="140%" height="140%">
              <FeGaussianBlur stdDeviation={RAY_BLUR} />
            </Filter>
          </Defs>
          <G filter={`url(#${blurId})`}>
            {Array.from({ length: RAY_COUNT }, (_, i) =>
              RAY_LAYERS.map((layer, j) => (
                <Path
                  key={`${i}-${j}`}
                  d={wedge(c, c, (360 / RAY_COUNT) * i - 90, layer.half)}
                  fill={`url(#${id})`}
                  fillOpacity={layer.alpha}
                />
              ))
            )}
          </G>
        </Svg>
      </Animated.View>
      <Animated.View style={[styles.halo, haloStyle]}>
        <GoldHalo color={withOpacity(color, 0.55 * strength)} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  round: {
    borderRadius: 999,
  },
  origin: {
    position: 'absolute',
    left: '50%',
    width: 0,
    height: 0,
  },
  particle: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  spark: {
    width: SPARK,
    height: SPARK,
    borderRadius: SPARK / 2,
  },
  light: {
    position: 'absolute',
    alignSelf: 'center',
  },
  // Halo : au plus 1,5 fois le coffre (règle des halos), centré
  halo: {
    position: 'absolute',
    left: '12%',
    top: '12%',
    width: '76%',
    height: '76%',
  },
});
