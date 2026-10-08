import { ActivityIndicator, Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { durations, springs } from '@/src/constants/motion';
import { opacityDisabled, palette, radius, reliefDepth, size, space } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { tap } from '@/src/utils/haptics';
import AppText, { TextTone } from './AppText';

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

const PRESSED_SCALE = 0.97; // secondary et text
const SINK_DURATION = 80; // primary : la face s'enfonce dans sa tranche

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
  const reduced = useReducedMotion();
  const isPrimary = variant === 'primary';

  // primary : enfoncement (0 → reliefDepth) ; autres : échelle (1 → 0,97)
  const press = useSharedValue(0);

  const inactive = disabled || loading;

  const faceStyle = useAnimatedStyle(() =>
    isPrimary
      ? { transform: [{ translateY: press.get() * reliefDepth }] }
      : { transform: [{ scale: 1 - press.get() * (1 - PRESSED_SCALE) }] }
  );

  const handlePressIn = () => {
    // Animations réduites : l'état pressé reste visible, sans mouvement progressif
    press.set(reduced ? 1 : withTiming(1, { duration: isPrimary ? SINK_DURATION : durations.pressIn }));
  };

  const handlePressOut = () => {
    press.set(reduced ? 0 : withSpring(0, springs.press));
  };

  // Vibration au relâchement : seulement si l'action part vraiment
  const handlePress = () => {
    if (isPrimary) tap();
    onPress();
  };

  const spinnerColor = isPrimary ? colors.onGold : variant === 'text' ? colors.gold : colors.text;

  const content = (
    <>
      {loading ? <ActivityIndicator size="small" color={spinnerColor} /> : null}
      <AppText variant="button" tone={LABEL_TONE[variant]} style={styles.label}>
        {label}
      </AppText>
    </>
  );

  return (
    <View style={[fullWidth && styles.fullWidth, style]}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={inactive}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={disabled && disabledReason ? disabledReason : accessibilityHint}
        accessibilityState={{ disabled: inactive, busy: loading }}
        // En chargement le bouton reste plein : seul l'état désactivé estompe
        style={[isPrimary && styles.reliefWrap, disabled && !loading && styles.disabled]}
      >
        {isPrimary ? (
          <>
            {/* Tranche : visible sous la face, recouverte quand la face s'enfonce */}
            <View style={[styles.edge, { backgroundColor: colors.goldDeep }]} />
            <Animated.View style={[styles.base, styles.primaryFace, { backgroundColor: colors.gold }, faceStyle]}>
              {content}
            </Animated.View>
          </>
        ) : (
          <Animated.View
            style={[
              styles.base,
              variant === 'secondary'
                ? [styles.secondaryFace, { borderColor: colors.controlBorder }]
                : styles.textFace,
              faceStyle,
            ]}
          >
            {content}
          </Animated.View>
        )}
      </Pressable>

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
  // La place de la tranche est réservée sous la face
  reliefWrap: {
    paddingBottom: reliefDepth,
  },
  edge: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: reliefDepth,
    borderRadius: radius.md,
    borderCurve: 'continuous',
  },
  primaryFace: {
    minHeight: size.buttonHeight,
    borderRadius: radius.md,
  },
  secondaryFace: {
    minHeight: size.buttonHeight,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  textFace: {
    minHeight: size.tapMin,
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
