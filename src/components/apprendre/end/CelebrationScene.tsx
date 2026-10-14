import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { BackdropFade } from '@/src/components/common/AppBackground';
import GroundShadow from '@/src/components/common/GroundShadow';
import Sheen from '@/src/components/common/Sheen';
import ValFullBody, { valPose } from '@/src/components/common/ValFullBody';
import { VAULT_IMAGE, VAULT_RATIO } from '@/src/components/onboarding/VaultScene';
import { motion, springs, timing } from '@/src/constants/motion';
import { palette, withOpacity } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';

// Repères du décor (fractions de l'image), comme l'écran de bienvenue
const DOOR_LIGHT = { cx: 0.42, cy: 0.66, r: 0.3 };
const POOL_LIGHT = { cx: 0.47, cy: 0.9, r: 0.38 };
const FEET_Y = 0.885;
const FADE_FROM = 0.86;
// Val en pied (saut) : part de la hauteur de la scène
const VAL_SHARE = 0.62;
const VAL_RATIO = valPose('saut').ratio;
// Haut assombri, sur cette part de la scène
const TOP_SHADE = 0.3;
const TOP_SHADE_OPACITY = 0.75;
// Val arrive en sautant
const JUMP = 48;

type CelebrationSceneProps = {
  width: number;
  height: number;
  // Coin du fond commun de la page (pour le fondu du bas)
  tab: string;
};

// Haut du bilan de fin : le décor du coffre de l'écran de bienvenue (même
// image, haut assombri, bas fondu dans le fond de l'app), la lumière de la
// porte, Val en pied qui arrive en sautant dans la lumière, avec son ombre.
// Décoratif. Animations réduites : tout est posé.
export default function CelebrationScene({ width, height, tab }: CelebrationSceneProps) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const reduced = useReducedMotion();

  // Image calée en bas de la scène, aussi large que l'écran au moins
  const imageWidth = Math.max(width, height * VAULT_RATIO);
  const imageHeight = imageWidth / VAULT_RATIO;
  const imageLeft = (width - imageWidth) / 2;
  const imageTop = height - imageHeight;
  const feetY = imageTop + imageHeight * FEET_Y;
  const valH = Math.round(height * VAL_SHARE);
  const valW = Math.round(valH * VAL_RATIO);
  const fadeTop = imageTop + imageHeight * FADE_FROM;

  const jump = useSharedValue(reduced ? 0 : -JUMP);
  const shown = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (reduced) return;
    shown.set(withTiming(1, timing(motion.state)));
    jump.set(withDelay(motion.stagger, withSpring(0, springs.celebrate)));
  }, [reduced, jump, shown]);
  const valStyle = useAnimatedStyle(() => ({ opacity: shown.get(), transform: [{ translateY: jump.get() }] }));

  return (
    <View
      style={{ width, height }}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View style={[styles.abs, { left: imageLeft, top: imageTop, width: imageWidth, height: imageHeight }]}>
        <Image source={VAULT_IMAGE} style={{ width: imageWidth, height: imageHeight }} resizeMode="cover" />
        <Sheen
          spots={[
            { ...DOOR_LIGHT, color: colors.gold, opacity: 0.3 },
            { ...POOL_LIGHT, color: colors.gold, opacity: 0.24 },
          ]}
        />
      </View>
      <LinearGradient
        colors={[withOpacity(colors.background, TOP_SHADE_OPACITY), withOpacity(colors.background, 0)]}
        style={[styles.abs, { left: 0, right: 0, top: 0, height: height * TOP_SHADE }]}
      />
      <BackdropFade tab={tab} top={fadeTop} height={height - fadeTop} direction="in" />

      <Animated.View style={[styles.abs, { left: 0, top: 0, width, height }, valStyle]}>
        <GroundShadow width={valW * 0.9} height={16} opacity={0.6} left={width / 2 - (valW * 0.9) / 2} top={feetY - 10} />
        <View style={[styles.abs, { left: (width - valW) / 2, top: feetY - valH * 0.97 }]}>
          <ValFullBody pose="saut" width={valW} height={0} />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  abs: {
    position: 'absolute',
  },
});
