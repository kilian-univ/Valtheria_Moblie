import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSpring } from 'react-native-reanimated';

import { springs } from '@/src/constants/motion';
import { space } from '@/src/constants/style/Style';
import { type Challenge, challengeHeadline } from '@/src/utils/accuracy';
import { feedback } from '@/src/utils/feedback';
import { celebrate } from '@/src/utils/haptics';
import AppText from './AppText';
import StreakMedal from './StreakMedal';
import ValFullBody from './ValFullBody';

const MEDAL = 132;
const VAL_HEIGHT = 150;
const FROM_SCALE = 0.2;
const FROM_ROTATION = -14; // degrés
const ARRIVE_DELAY = 150;

// Contenu de la célébration d'un défi de précision gagné, comme celle d'une
// médaille de série : la médaille à l'éclair arrive en grandissant et en
// tournant, Val fier, son « medal » (ou son remplaçant) et vibration de
// fête. Le parent pose les confettis et le bouton. Animations réduites :
// médaille affichée directement.
export default function ChallengeCelebration({ challenge }: { challenge: Challenge }) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(reduced ? 1 : FROM_SCALE);
  const rotation = useSharedValue(reduced ? 0 : FROM_ROTATION);

  useEffect(() => {
    celebrate();
    feedback.medal();
    if (!reduced) {
      scale.set(withDelay(ARRIVE_DELAY, withSpring(1, springs.celebrate)));
      rotation.set(withDelay(ARRIVE_DELAY, withSpring(0, springs.celebrate)));
    }
  }, [reduced, scale, rotation]);

  const medalStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.get() }, { rotate: `${rotation.get()}deg` }],
  }));

  const headline = challengeHeadline(challenge);
  return (
    <View style={styles.wrap}>
      <Animated.View style={medalStyle}>
        <StreakMedal days={challenge.value} size={MEDAL} earned kind={challenge.kind} />
      </Animated.View>
      <View style={styles.texts} accessible accessibilityLabel={`${headline} ${challenge.line}`}>
        <AppText variant="title1" accessibilityRole="header" style={styles.center}>
          {headline}
        </AppText>
        <AppText variant="body" tone="subtitle" style={styles.center}>
          {challenge.line}
        </AppText>
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
