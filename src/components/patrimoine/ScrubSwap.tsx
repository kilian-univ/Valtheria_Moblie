import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { type SharedValue, useAnimatedStyle } from 'react-native-reanimated';

type ScrubSwapProps = {
  // Point touché sur la courbe (-1 : aucun), sur le fil d'interface
  scrub: SharedValue<number>;
  // Au repos : le rendu habituel (React)
  rest: ReactNode;
  // Doigt sur la courbe : les valeurs du point touché (textes vivants)
  live: ReactNode;
};

// Au repos, le rendu de React ; tant que le doigt est sur la courbe, la
// couche vivante posée par-dessus, au même endroit. La bascule se fait sur le
// fil d'interface : aucun rendu React pendant le geste (lot 8).
export default function ScrubSwap({ scrub, rest, live }: ScrubSwapProps) {
  const restStyle = useAnimatedStyle(() => ({ opacity: scrub.get() >= 0 ? 0 : 1 }));
  const liveStyle = useAnimatedStyle(() => ({ opacity: scrub.get() >= 0 ? 1 : 0 }));
  return (
    <View>
      <Animated.View style={restStyle}>{rest}</Animated.View>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, liveStyle]}>
        {live}
      </Animated.View>
    </View>
  );
}
