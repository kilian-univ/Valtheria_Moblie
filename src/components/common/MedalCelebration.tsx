import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSpring } from 'react-native-reanimated';

import { springs } from '@/src/constants/motion';
import { space } from '@/src/constants/style/Style';
import { feedback } from '@/src/utils/feedback';
import { celebrate } from '@/src/utils/haptics';
import type { Medal } from '@/src/utils/streakRewards';
import AppText from './AppText';
import StreakMedal from './StreakMedal';
import ValFullBody from './ValFullBody';

const MEDAL = 132;
const VAL_HEIGHT = 150;
const FROM_SCALE = 0.2;
const FROM_ROTATION = -14; // degrés
const ARRIVE_DELAY = 150;

type MedalCelebrationProps = {
  medal: Medal;
  // Cette leçon fait aussi gagner un gel de série
  freezeGained?: boolean;
};

// Contenu de la célébration d'un palier de série : la médaille arrive en
// grandissant et en tournant légèrement, Val fier, vibration. Le parent pose
// les confettis (GoldConfetti) et le bouton. Animations réduites : médaille
// affichée directement.
export default function MedalCelebration({ medal, freezeGained = false }: MedalCelebrationProps) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(reduced ? 1 : FROM_SCALE);
  const rotation = useSharedValue(reduced ? 0 : FROM_ROTATION);

  useEffect(() => {
    celebrate();
    feedback.unlock();
    if (reduced) return;
    scale.set(withDelay(ARRIVE_DELAY, withSpring(1, springs.celebrate)));
    rotation.set(withDelay(ARRIVE_DELAY, withSpring(0, springs.celebrate)));
  }, [reduced, scale, rotation]);

  const medalStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.get() }, { rotate: `${rotation.get()}deg` }],
  }));

  const lines = [`${medal.days} jours d’affilée. Continue comme ça.`, freezeGained ? 'Et un gel de série en réserve.' : null].filter(
    (l): l is string => l !== null
  );

  return (
    <View style={styles.wrap}>
      <Animated.View style={medalStyle}>
        <StreakMedal days={medal.days} size={MEDAL} earned />
      </Animated.View>
      <View style={styles.texts} accessible accessibilityLabel={`Nouvelle médaille : ${medal.name} ! ${lines.join(' ')}`}>
        <AppText variant="title1" accessibilityRole="header" style={styles.center}>
          {`Nouvelle médaille : ${medal.name} !`}
        </AppText>
        {lines.map((line) => (
          <AppText key={line} variant="body" tone="subtitle" style={styles.center}>
            {line}
          </AppText>
        ))}
      </View>
      <ValFullBody pose="fier" height={VAL_HEIGHT} minHeight={120} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: space[5],
  },
  texts: {
    gap: space[2],
    alignItems: 'center',
  },
  center: {
    textAlign: 'center',
  },
});
