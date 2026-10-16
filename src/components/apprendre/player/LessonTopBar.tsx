import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import AppText from '@/src/components/common/AppText';
import IconButton from '@/src/components/common/IconButton';
import { motion, springs, timing } from '@/src/constants/motion';
import { fonts, palette, radius, runBadgeFx, size, space, withOpacity } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { runEvent } from '@/src/utils/accuracy';
import { runAccessibilityLabel, runBadge } from '@/src/utils/lessonPlayer';
import { SparkBurst, SparkTrail } from './RunEffects';

const CLOSE_ICON = 26;
const BAR_HEIGHT = 14;
// Reflet clair en haut du remplissage
const SHINE_HEIGHT = 3;
const SHINE_INSET_X = 6;
const SHINE_INSET_TOP = 3;
// Pastille d'affilée
const RUN_HEIGHT = 32;
const RUN_ICON = 16;
const RUN_FONT_SIZE = 16;
// Reflet de la barre en feu : bande claire qui la parcourt en boucle
const FIRE_SHINE_WIDTH = 48;
const FIRE_GLOW_BLUR = 10;
// Éclat doré : bande qui traverse la barre une fois
const GLINT_WIDTH = 64;

type LessonTopBarProps = {
  // De 0 à 1
  progress: number;
  // Bonnes réponses du premier coup d'affilée
  run: number;
  onClose: () => void;
};

type Fx = {
  // Compteurs : chaque hausse rejoue l'effet
  appear: number;
  pulse: number;
  burst: number;
  // Chiffre affiché pendant que la pastille s'efface (série cassée)
  leaving: number | null;
};

// Barre du haut du lecteur : croix, progression (ressort de 300 ms après
// chaque écran validé), et la pastille ⚡ des bonnes réponses du premier coup
// d'affilée :
// - à 3, elle surgit (0 → 1,2 → 1, ressort) et une traînée d'étincelles
//   dorées parcourt la barre de gauche à droite ;
// - à chaque bonne réponse de plus, le chiffre pulse (1,15 → 1) ;
// - à 5 et à 10, une gerbe d'étincelles autour d'elle ;
// - tant que la série dure, la barre « prend feu » : remplissage de l'or
//   vers l'orange, reflet qui la parcourt lentement en boucle, lueur
//   autour ; retour à l'or en 300 ms quand la série se casse ;
// - série cassée : elle rétrécit et s'efface (200 ms).
// Animations réduites : la pastille apparaît, change et disparaît
// directement, la barre change de couleur sans reflet animé, sans
// étincelles. Les sons et vibrations sont joués par
// le lecteur (ApprendreDetailScreen).
export default function LessonTopBar({ progress, run, onClose }: LessonTopBarProps) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const reduced = useReducedMotion();

  const clamped = Math.min(1, Math.max(0, Number.isFinite(progress) ? progress : 0));
  const badge = runBadge(run);

  const [trackWidth, setTrackWidth] = useState(0);
  const fillWidth = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const glint = useSharedValue(-GLINT_WIDTH);

  // Ce que change la nouvelle valeur de la série (ajusté pendant le rendu)
  const [prevRun, setPrevRun] = useState(run);
  const [fx, setFx] = useState<Fx>({ appear: 0, pulse: 0, burst: 0, leaving: null });
  if (run !== prevRun) {
    const event = runEvent(prevRun, run);
    setPrevRun(run);
    if (event?.kind === 'appear') setFx((f) => ({ ...f, appear: f.appear + 1, leaving: null }));
    else if (event?.kind === 'grow') setFx((f) => ({ ...f, pulse: f.pulse + 1 }));
    else if (event?.kind === 'milestone') setFx((f) => ({ ...f, pulse: f.pulse + 1, burst: f.burst + 1 }));
    else if (event?.kind === 'break') setFx((f) => ({ ...f, leaving: runBadge(prevRun) }));
  }
  const shown = badge ?? fx.leaving;
  const onFire = badge !== null;

  // Barre en feu : passage de l'or à l'orange (et retour), reflet en boucle
  const fire = useSharedValue(onFire ? 1 : 0);
  const shine = useSharedValue(0);
  useEffect(() => {
    fire.set(reduced ? (onFire ? 1 : 0) : withTiming(onFire ? 1 : 0, timing(runBadgeFx.fireFade)));
    if (onFire && !reduced) {
      shine.set(0);
      shine.set(withRepeat(withTiming(1, { duration: runBadgeFx.fireShine, easing: Easing.inOut(Easing.quad) }), -1));
    } else {
      shine.set(0);
    }
  }, [onFire, reduced, fire, shine]);

  useEffect(() => {
    if (trackWidth === 0) return;
    const target = clamped * trackWidth;
    fillWidth.set(reduced ? target : withSpring(target, springs.progress));
  }, [clamped, trackWidth, reduced, fillWidth]);

  // Apparition : surgit (0 → 1,2 → 1), et l'éclat traverse la barre
  useEffect(() => {
    if (fx.appear === 0) return;
    opacity.set(1);
    if (reduced) {
      scale.set(1);
      return;
    }
    scale.set(0);
    scale.set(withSequence(withTiming(runBadgeFx.peak, timing(motion.sheet)), withSpring(1, springs.celebrate)));
    if (trackWidth > 0) {
      glint.set(-GLINT_WIDTH);
      glint.set(withTiming(trackWidth, timing(runBadgeFx.trail)));
    }
  }, [fx.appear, reduced, scale, opacity, glint, trackWidth]);

  // Une bonne réponse de plus : petite pulsation du chiffre
  useEffect(() => {
    if (fx.pulse === 0 || reduced) return;
    scale.set(withSequence(withTiming(runBadgeFx.pulse, timing(motion.tap)), withSpring(1, springs.press)));
  }, [fx.pulse, reduced, scale]);

  // Série cassée : la pastille rétrécit et s'efface, puis disparaît
  const leaving = fx.leaving !== null;
  useEffect(() => {
    if (!leaving) return;
    if (!reduced) {
      scale.set(withTiming(0.6, timing(runBadgeFx.exit)));
      opacity.set(withTiming(0, timing(runBadgeFx.exit)));
    }
    const timer = setTimeout(() => setFx((f) => ({ ...f, leaving: null })), reduced ? 0 : runBadgeFx.exit);
    return () => clearTimeout(timer);
  }, [leaving, reduced, scale, opacity]);

  const fillStyle = useAnimatedStyle(() => ({ width: fillWidth.get() }));
  const fireStyle = useAnimatedStyle(() => ({ opacity: fire.get() }));
  const shineStyle = useAnimatedStyle(() => ({
    opacity: fire.get(),
    transform: [{ translateX: -FIRE_SHINE_WIDTH + shine.get() * (fillWidth.get() + FIRE_SHINE_WIDTH) }],
  }));
  const badgeStyle = useAnimatedStyle(() => ({ opacity: opacity.get(), transform: [{ scale: scale.get() }] }));
  const glintStyle = useAnimatedStyle(() => ({ transform: [{ translateX: glint.get() }] }));

  const onLayout = (e: LayoutChangeEvent) => setTrackWidth(e.nativeEvent.layout.width);

  return (
    <View style={styles.row}>
      <IconButton
        variant="plain"
        icon="close"
        iconSize={CLOSE_ICON}
        color={colors.subtitle}
        onPress={onClose}
        accessibilityLabel="Fermer la leçon"
        style={styles.close}
      />

      <View style={styles.trackSlot}>
        {/* Lueur orangée autour de la barre en feu */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.fireGlow,
            { boxShadow: [{ offsetX: 0, offsetY: 0, blurRadius: FIRE_GLOW_BLUR, color: withOpacity(colors.streak, runBadgeFx.fireGlow) }] },
            fireStyle,
          ]}
        />
        <View
          onLayout={onLayout}
          accessibilityRole="progressbar"
          accessibilityLabel="Progression de la leçon"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(clamped * 100)}
          style={[styles.track, { backgroundColor: colors.surface }]}
        >
          <Animated.View style={[styles.fill, { backgroundColor: colors.gold }, fillStyle]}>
            {/* En feu : dégradé de l'or vers l'orange, par-dessus l'or */}
            <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, fireStyle]}>
              <LinearGradient
                colors={[colors.gold, colors.streak]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
            <Animated.View pointerEvents="none" style={[styles.fireShine, shineStyle]}>
              <LinearGradient
                colors={['transparent', colors.goldGlint, 'transparent']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
            <View style={[styles.shine, { backgroundColor: colors.progressShine }]} />
          </Animated.View>
          <Animated.View pointerEvents="none" style={[styles.glint, glintStyle]}>
            <LinearGradient
              colors={['transparent', colors.goldGlint, 'transparent']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </View>
        {/* Traînée d'étincelles, par-dessus la barre (elle peut en déborder) */}
        {!reduced && fx.appear > 0 && trackWidth > 0 ? <SparkTrail key={`t${fx.appear}`} width={trackWidth} /> : null}
      </View>

      {shown !== null ? (
        <View>
          <Animated.View
            style={[styles.run, badgeStyle]}
            accessible={badge !== null}
            accessibilityLabel={runAccessibilityLabel(shown)}
            accessibilityLiveRegion="polite"
          >
            {/* Fond or-orangé tant que la série dure */}
            <LinearGradient
              colors={[colors.gold, colors.streak]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[StyleSheet.absoluteFill, styles.runFace]}
            />
            <Ionicons name="flash" size={RUN_ICON} color={colors.onGold} />
            <AppText style={[styles.runText, { color: colors.onGold }]}>{shown}</AppText>
          </Animated.View>
          {!reduced && fx.burst > 0 && badge !== null ? <SparkBurst key={`b${fx.burst}`} /> : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    paddingLeft: space[1],
    paddingRight: space[4],
    minHeight: size.tapMin,
  },
  close: {
    width: size.tapMin,
    height: size.tapMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackSlot: {
    flex: 1,
    justifyContent: 'center',
  },
  fireGlow: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: BAR_HEIGHT,
    borderRadius: radius.pill,
  },
  fireShine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: FIRE_SHINE_WIDTH,
  },
  runFace: {
    borderRadius: radius.pill,
  },
  track: {
    height: BAR_HEIGHT,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  fill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  shine: {
    position: 'absolute',
    top: SHINE_INSET_TOP,
    left: SHINE_INSET_X,
    right: SHINE_INSET_X,
    height: SHINE_HEIGHT,
    borderRadius: radius.pill,
  },
  glint: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: GLINT_WIDTH,
  },
  run: {
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1],
    height: RUN_HEIGHT,
    paddingHorizontal: space[2] + 2,
    borderRadius: radius.pill,
  },
  runText: {
    fontFamily: fonts.bodyExtraBold,
    fontSize: RUN_FONT_SIZE,
    lineHeight: RUN_HEIGHT - 8,
    fontVariant: ['tabular-nums'],
  },
});
