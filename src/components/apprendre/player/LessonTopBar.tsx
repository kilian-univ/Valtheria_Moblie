import { useEffect, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import AppText from '@/src/components/common/AppText';
import { counterEasing, durations, springs } from '@/src/constants/motion';
import { fonts, palette, radius, size, space } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { runLabel } from '@/src/utils/lessonPlayer';
import IconButton from '@/src/components/common/IconButton';

const CLOSE_ICON = 26;
const BAR_HEIGHT = 14;
// Reflet clair dans le remplissage
const SHINE_HEIGHT = 3;
const SHINE_INSET_X = 8;
const SHINE_INSET_TOP = 3;
const GLOW_BLUR = 12;
const RUN_FONT_SIZE = 12;
const RUN_LINE_HEIGHT = 16;
const RUN_POP_FROM = 0.7;

type LessonTopBarProps = {
  // De 0 à 1
  progress: number;
  // Bonnes réponses du premier coup d'affilée
  run: number;
  onClose: () => void;
};

// Barre du haut du lecteur : croix, progression, série d'affilée (dès 3).
export default function LessonTopBar({ progress, run, onClose }: LessonTopBarProps) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const reduced = useReducedMotion();

  const clamped = Math.min(1, Math.max(0, Number.isFinite(progress) ? progress : 0));
  const label = runLabel(run);
  const onFire = label !== null;

  const [trackWidth, setTrackWidth] = useState(0);
  const fillWidth = useSharedValue(0);
  const glow = useSharedValue(0);
  const pop = useSharedValue(1);

  useEffect(() => {
    if (trackWidth === 0) return;
    const target = clamped * trackWidth;
    fillWidth.set(reduced ? target : withTiming(target, { duration: durations.counter, easing: counterEasing }));
  }, [clamped, trackWidth, reduced, fillWidth]);

  useEffect(() => {
    glow.set(withTiming(onFire ? 1 : 0, { duration: durations.fade }));
  }, [onFire, glow]);

  // Petit rebond à chaque nouvelle bonne réponse de la série
  useEffect(() => {
    if (!onFire || reduced) return;
    pop.set(RUN_POP_FROM);
    pop.set(withSpring(1, springs.celebrate));
  }, [run, onFire, reduced, pop]);

  const fillStyle = useAnimatedStyle(() => ({ width: fillWidth.get() }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.get() }));
  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.get() }] }));

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

      <View style={styles.barColumn}>
        <View style={styles.runSlot}>
          {label ? (
            <Animated.View style={popStyle} accessibilityLiveRegion="polite">
              <AppText style={[styles.runText, { color: colors.gold }]}>{label}</AppText>
            </Animated.View>
          ) : null}
        </View>

        <View>
          {/* Lueur dorée sous la barre pendant une série */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.glow,
              {
                boxShadow: [{ offsetX: 0, offsetY: 0, blurRadius: GLOW_BLUR, color: colors.goldRing }],
              },
              glowStyle,
            ]}
          />
          <View
            onLayout={onLayout}
            accessibilityRole="progressbar"
            accessibilityLabel="Progression de la leçon"
            accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
            style={[styles.track, { backgroundColor: colors.surface }]}
          >
            <Animated.View style={[styles.fill, { backgroundColor: colors.gold }, fillStyle]}>
              <View style={[styles.shine, { backgroundColor: colors.progressShine }]} />
            </Animated.View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: space[2],
    paddingLeft: space[2],
    paddingRight: space[5],
    paddingBottom: space[2],
  },
  close: {
    width: size.tapMin,
    height: size.tapMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // La barre est centrée sur la croix ; la série s'affiche au-dessus
  barColumn: {
    flex: 1,
    paddingBottom: (size.tapMin - BAR_HEIGHT) / 2,
  },
  runSlot: {
    minHeight: RUN_LINE_HEIGHT,
    alignItems: 'flex-end',
    marginBottom: space[1],
  },
  runText: {
    fontFamily: fonts.bodySemibold,
    fontSize: RUN_FONT_SIZE,
    lineHeight: RUN_LINE_HEIGHT,
  },
  glow: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
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
  },
  shine: {
    position: 'absolute',
    top: SHINE_INSET_TOP,
    left: SHINE_INSET_X,
    right: SHINE_INSET_X,
    height: SHINE_HEIGHT,
    borderRadius: radius.pill,
  },
});
