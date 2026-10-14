import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import AppText from '@/src/components/common/AppText';
import IconButton from '@/src/components/common/IconButton';
import { motion, springs, timing } from '@/src/constants/motion';
import { fonts, palette, radius, size, space } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { runAccessibilityLabel, runBadge } from '@/src/utils/lessonPlayer';

const CLOSE_ICON = 26;
const BAR_HEIGHT = 14;
// Reflet clair en haut du remplissage
const SHINE_HEIGHT = 3;
const SHINE_INSET_X = 6;
const SHINE_INSET_TOP = 3;
// Pastille d'affilée
const RUN_HEIGHT = 28;
const RUN_ICON = 14;
const RUN_FONT_SIZE = 14;
const RUN_POP_FROM = 0.7;
// Éclat doré : bande qui traverse la barre une fois
const GLINT_WIDTH = 64;

type LessonTopBarProps = {
  // De 0 à 1
  progress: number;
  // Bonnes réponses du premier coup d'affilée
  run: number;
  onClose: () => void;
};

// Barre du haut du lecteur : croix, progression (ressort de 300 ms après
// chaque écran validé), pastille d'affilée dès 3 bonnes réponses du premier
// coup ; à son arrivée, un éclat doré parcourt la barre une fois.
export default function LessonTopBar({ progress, run, onClose }: LessonTopBarProps) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const reduced = useReducedMotion();

  const clamped = Math.min(1, Math.max(0, Number.isFinite(progress) ? progress : 0));
  const badge = runBadge(run);
  const onFire = badge !== null;

  const [trackWidth, setTrackWidth] = useState(0);
  const fillWidth = useSharedValue(0);
  const pop = useSharedValue(1);
  const glint = useSharedValue(-GLINT_WIDTH);
  const wasOnFire = useRef(false);

  useEffect(() => {
    if (trackWidth === 0) return;
    const target = clamped * trackWidth;
    fillWidth.set(reduced ? target : withSpring(target, springs.progress));
  }, [clamped, trackWidth, reduced, fillWidth]);

  // Petit rebond de la pastille à chaque nouvelle bonne réponse de la série
  useEffect(() => {
    if (!onFire || reduced) return;
    pop.set(RUN_POP_FROM);
    pop.set(withSpring(1, springs.celebrate));
  }, [run, onFire, reduced, pop]);

  // Éclat doré : une seule traversée, quand la pastille apparaît
  useEffect(() => {
    if (onFire && !wasOnFire.current && !reduced && trackWidth > 0) {
      glint.set(-GLINT_WIDTH);
      glint.set(withTiming(trackWidth, timing(motion.max)));
    }
    wasOnFire.current = onFire;
  }, [onFire, reduced, trackWidth, glint]);

  const fillStyle = useAnimatedStyle(() => ({ width: fillWidth.get() }));
  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.get() }] }));
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

      {badge !== null ? (
        <Animated.View
          style={[styles.run, { backgroundColor: colors.goldSoft }, popStyle]}
          accessible
          accessibilityLabel={runAccessibilityLabel(badge)}
          accessibilityLiveRegion="polite"
        >
          <Ionicons name="flash" size={RUN_ICON} color={colors.gold} />
          <AppText style={[styles.runText, { color: colors.gold }]}>{badge}</AppText>
        </Animated.View>
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
  track: {
    flex: 1,
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
