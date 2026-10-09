import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import AppText from '@/src/components/common/AppText';
import { durations } from '@/src/constants/motion';
import { fonts, palette, radius, space, withOpacity } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { BUBBLE_H, BUBBLE_W } from '@/src/utils/modulePath';

const BOUNCE = 6;
const BOUNCE_PERIOD = 1200;
const TIP = 12;
const FONT_SIZE = 15;
const LETTER_SPACING = 0.6;
// Ombre nette de 4 px sous la bulle
const SHADOW_Y = 4;
const SHADOW_OPACITY = 0.35;

type StartBubbleProps = {
  // Couleur du texte : tranche du module
  textColor: string;
  onPress: () => void;
  // Apparition en fondu après ce délai (déverrouillage) ; absent : tout de suite
  appearDelay?: number;
};

// Bulle « COMMENCER » au-dessus du rond en cours, pointe vers lui. Rebondit
// doucement en boucle (pas avec les animations réduites).
export default function StartBubble({ textColor, onPress, appearDelay }: StartBubbleProps) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const reduced = useReducedMotion();
  const y = useSharedValue(0);
  const opacity = useSharedValue(appearDelay === undefined ? 1 : 0);

  useEffect(() => {
    if (appearDelay !== undefined) {
      // Peut arriver après coup (déverrouillage au retour) : on repart de 0
    opacity.set(0);
    opacity.set(withDelay(appearDelay, withTiming(1, { duration: durations.enterOpacity })));
    }
    if (reduced) return;
    const half = { duration: BOUNCE_PERIOD / 2, easing: Easing.inOut(Easing.sin) };
    y.set(withRepeat(withSequence(withTiming(-BOUNCE, half), withTiming(0, half)), -1));
  }, [reduced, appearDelay, y, opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.get(), transform: [{ translateY: y.get() }] }));

  return (
    <Animated.View style={[styles.wrap, style]}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel="Commencer la leçon en cours"
        style={[
          styles.bubble,
          {
            backgroundColor: colors.ivory,
            boxShadow: [{ offsetX: 0, offsetY: SHADOW_Y, blurRadius: 0, color: withOpacity(colors.groundShadow, SHADOW_OPACITY) }],
          },
        ]}
      >
        <AppText maxFontSizeMultiplier={1.2} style={[styles.label, { color: textColor }]}>
          COMMENCER
        </AppText>
      </Pressable>
      <View style={[styles.tip, { backgroundColor: colors.ivory }]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: BUBBLE_W,
    alignItems: 'center',
  },
  bubble: {
    minHeight: BUBBLE_H,
    paddingHorizontal: space[4],
    borderRadius: radius.md,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: fonts.bodyExtraBold,
    fontSize: FONT_SIZE,
    lineHeight: 20,
    letterSpacing: LETTER_SPACING,
  },
  // Pointe : carré tourné, à moitié caché sous la bulle
  tip: {
    width: TIP,
    height: TIP,
    marginTop: -TIP / 2,
    transform: [{ rotate: '45deg' }],
    borderRadius: 2,
  },
});
