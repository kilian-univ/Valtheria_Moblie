import { ActivityIndicator, Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { durations, springs } from '@/src/constants/motion';
import { opacityDisabled, palette, radius, size, space } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { tap } from '@/src/utils/haptics';
import AppText, { TextTone } from './AppText';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type ButtonVariant = 'primary' | 'secondary' | 'text';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  // Pourquoi le bouton est inactif, affiché sous le bouton
  disabledReason?: string;
  loading?: boolean;
  // Pleine largeur par défaut, sauf pour la variante text
  fullWidth?: boolean;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
};

const LABEL_TONE: Record<ButtonVariant, TextTone> = {
  primary: 'onGold',
  secondary: 'text',
  text: 'gold',
};

const PRESSED_SCALE = 0.97;

export default function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  disabledReason,
  loading = false,
  fullWidth = variant !== 'text',
  accessibilityHint,
  style,
}: ButtonProps) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const scale = useSharedValue(1);

  const inactive = disabled || loading;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.get() }],
  }));

  const handlePressIn = () => {
    scale.set(withTiming(PRESSED_SCALE, { duration: durations.pressIn }));
  };

  // Vibration au relâchement : seulement si l'action part vraiment
  const handlePress = () => {
    if (variant === 'primary') tap();
    onPress();
  };

  const handlePressOut = () => {
    scale.set(withSpring(1, springs.press));
  };

  const variantStyle: ViewStyle =
    variant === 'primary'
      ? { backgroundColor: colors.gold, minHeight: size.buttonHeight, borderRadius: radius.md }
      : variant === 'secondary'
        ? {
            minHeight: size.buttonHeight,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: colors.controlBorder,
          }
        : { minHeight: size.tapMin };

  const spinnerColor = variant === 'primary' ? colors.onGold : variant === 'text' ? colors.gold : colors.text;

  return (
    <View style={[fullWidth && styles.fullWidth, style]}>
      <AnimatedPressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={inactive}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={disabled && disabledReason ? disabledReason : accessibilityHint}
        accessibilityState={{ disabled: inactive, busy: loading }}
        style={[
          styles.base,
          variantStyle,
          // En chargement le bouton reste plein : seul l'état désactivé estompe
          disabled && !loading && styles.disabled,
          animatedStyle,
        ]}
      >
        {loading ? <ActivityIndicator size="small" color={spinnerColor} /> : null}
        <AppText variant="button" tone={LABEL_TONE[variant]} style={styles.label}>
          {label}
        </AppText>
      </AnimatedPressable>

      {disabled && disabledReason ? (
        <AppText
          variant="callout"
          tone="subtitle"
          style={styles.reason}
          accessibilityElementsHidden
          importantForAccessibility="no"
        >
          {disabledReason}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fullWidth: {
    alignSelf: 'stretch',
  },
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[2],
    paddingHorizontal: space[4],
    borderCurve: 'continuous',
  },
  label: {
    flexShrink: 1,
    textAlign: 'center',
    paddingVertical: space[2], // le bouton grandit si le texte est agrandi
  },
  disabled: {
    opacity: opacityDisabled,
  },
  reason: {
    marginTop: space[2],
    textAlign: 'center',
  },
});
