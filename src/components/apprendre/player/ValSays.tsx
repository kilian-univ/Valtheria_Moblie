import { ReactNode, useEffect, useState } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { AVATAR_FACE, ValBeside, ValPicture } from '@/src/components/common/ValBubble';
import { motion, springs, timing } from '@/src/constants/motion';
import type { ValLine, ValMood } from '@/src/lesson/model';
import { windowFitHeight } from '@/src/utils/fit';

// Buste de Val (cadrage md, fond transparent) à gauche de sa bulle ; réduit
// sur un écran bas (iPhone SE), jamais sous VAL_BUST_MIN
export const VAL_BUST = 100;
const VAL_BUST_MIN = 80;
// Petit bond quand son humeur change
const BOUNCE_SCALE = 1.06;
// Petit bond de la série d'affilée (px)
const HOP_HEIGHT = 10;

type ValSaysProps = {
  line: ValLine;
  // Attente avant l'apparition de la bulle (cascade du lecteur)
  bubbleDelay: number;
  // false : la réplique s'affiche d'un coup (simulateur)
  typing?: boolean;
  // Chaque hausse : petit bond de Val (série d'affilée qui démarre, palier)
  hop?: number;
};

// Val pose la question : son buste à gauche, sa bulle à droite, pointe vers
// sa bouche. Une nouvelle réplique remonte la bulle (elle s'écrit, un
// toucher l'affiche d'un coup) ; une nouvelle humeur passe en fondu de
// 150 ms avec un petit bond.
export default function ValSays({ line, bubbleDelay, typing, hop = 0 }: ValSaysProps) {
  const { height } = useWindowDimensions();
  const bust = windowFitHeight(VAL_BUST, VAL_BUST_MIN, height);
  return (
    <ValBeside
      figure={<ValBust mood={line.mood} size={bust} hop={hop} />}
      width={bust}
      height={bust}
      face={AVATAR_FACE}
      text={line.line}
      delay={bubbleDelay}
      typing={typing}
    />
  );
}

function ValBust({ mood, size, hop }: { mood: ValMood; size: number; hop: number }) {
  const reduced = useReducedMotion();
  // Humeur affichée et précédente (fondu de l'une sur l'autre)
  const [shown, setShown] = useState(mood);
  const [previous, setPrevious] = useState<ValMood | null>(null);
  if (mood !== shown) {
    setPrevious(reduced ? null : shown);
    setShown(mood);
  }

  const bounce = useSharedValue(1);
  useEffect(() => {
    if (previous === null) return;
    bounce.set(withSequence(withTiming(BOUNCE_SCALE, timing(motion.tap)), withSpring(1, springs.press)));
    const timer = setTimeout(() => setPrevious(null), motion.state);
    return () => clearTimeout(timer);
  }, [previous, bounce]);

  // Petit bond (série d'affilée) : monte et retombe en ressort
  const lift = useSharedValue(0);
  useEffect(() => {
    if (hop === 0 || reduced) return;
    lift.set(withSequence(withTiming(-HOP_HEIGHT, timing(motion.tap)), withSpring(0, springs.celebrate)));
  }, [hop, reduced, lift]);

  const bounceStyle = useAnimatedStyle(() => ({ transform: [{ translateY: lift.get() }, { scale: bounce.get() }] }));

  return (
    <Animated.View style={[{ width: size, height: size }, bounceStyle]}>
      {previous ? <ValPicture mood={previous} frame="md" style={[styles.picture, { width: size, height: size }]} /> : null}
      <FadeIn key={shown} active={previous !== null}>
        <ValPicture mood={shown} frame="md" style={[styles.picture, { width: size, height: size }]} />
      </FadeIn>
    </Animated.View>
  );
}

// Couche qui apparaît en fondu à son montage (active), sinon tout de suite
function FadeIn({ active, children }: { active: boolean; children: ReactNode }) {
  const [animate] = useState(active);
  const opacity = useSharedValue(animate ? 0 : 1);
  useEffect(() => {
    if (animate) opacity.set(withTiming(1, timing(motion.state)));
  }, [animate, opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  return <Animated.View style={[StyleSheet.absoluteFill, style]}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  picture: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});
