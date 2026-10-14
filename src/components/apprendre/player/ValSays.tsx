import { ReactNode, useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
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

// Buste de Val (cadrage md, fond transparent) à gauche de sa bulle
export const VAL_BUST = 100;
// Petit bond quand son humeur change
const BOUNCE_SCALE = 1.06;

type ValSaysProps = {
  line: ValLine;
  // Attente avant l'apparition de la bulle (cascade du lecteur)
  bubbleDelay: number;
  // false : la réplique s'affiche d'un coup (simulateur)
  typing?: boolean;
};

// Val pose la question : son buste à gauche, sa bulle à droite, pointe vers
// sa bouche. Une nouvelle réplique remonte la bulle (elle s'écrit, un
// toucher l'affiche d'un coup) ; une nouvelle humeur passe en fondu de
// 150 ms avec un petit bond.
export default function ValSays({ line, bubbleDelay, typing }: ValSaysProps) {
  return (
    <ValBeside
      figure={<ValBust mood={line.mood} />}
      width={VAL_BUST}
      height={VAL_BUST}
      face={AVATAR_FACE}
      text={line.line}
      delay={bubbleDelay}
      typing={typing}
    />
  );
}

function ValBust({ mood }: { mood: ValMood }) {
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

  const bounceStyle = useAnimatedStyle(() => ({ transform: [{ scale: bounce.get() }] }));

  return (
    <Animated.View style={[styles.bust, bounceStyle]}>
      {previous ? <ValPicture mood={previous} frame="md" style={styles.picture} /> : null}
      <FadeIn key={shown} active={previous !== null}>
        <ValPicture mood={shown} frame="md" style={styles.picture} />
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
  bust: {
    width: VAL_BUST,
    height: VAL_BUST,
  },
  picture: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: VAL_BUST,
    height: VAL_BUST,
  },
});
