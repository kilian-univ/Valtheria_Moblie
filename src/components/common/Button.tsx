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

// primary, success, danger : en relief (face + tranche)
// textDanger : bouton texte rouge (action destructrice discrète)
export type ButtonVariant = 'primary' | 'success' | 'danger' | 'secondary' | 'text' | 'textDanger';

type ReliefColors = { face: 'gold' | 'success' | 'error'; edge: 'goldDeep' | 'successDeep' | 'dangerDeep' };

const RELIEF: Partial<Record<ButtonVariant, ReliefColors>> = {
  primary: { face: 'gold', edge: 'goldDeep' },
  success: { face: 'success', edge: 'successDeep' },
  danger: { face: 'error', edge: 'dangerDeep' },
};

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
  // Pas de vibration d'appui : l'action déclenche déjà la sienne
  silent?: boolean;
  style?: StyleProp<ViewStyle>;
};

const LABEL_TONE: Record<ButtonVariant, TextTone> = {
  primary: 'onGold',
  success: 'background',
  danger: 'background',
  secondary: 'text',
  text: 'gold',
  textDanger: 'error',
};

const PRESSED_SCALE = 0.97; // secondary et boutons texte

export default function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  disabledReason,
  loading = false,
  fullWidth = variant !== 'text' && variant !== 'textDanger',
  accessibilityHint,
  silent = false,
  style,
}: ButtonProps) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const reduced = useReducedMotion();
  const relief = RELIEF[variant];
  const isRelief = relief !== undefined;
  const isText = variant === 'text' || variant === 'textDanger';

  // relief : enfoncement (0 → reliefDepth) ; autres : échelle (1 → 0,97)
  const press = useSharedValue(0);

  const inactive = disabled || loading;

  const faceStyle = useAnimatedStyle(() =>
    isRelief
      ? { transform: [{ translateY: press.get() * reliefDepth }] }
      : { transform: [{ scale: 1 - press.get() * (1 - PRESSED_SCALE) }] }
  );

  const handlePressIn = () => {
    // Animations réduites : l'état pressé reste visible, sans mouvement progressif
    press.set(reduced ? 1 : withTiming(1, { duration: isRelief ? durations.sink : durations.pressIn }));
  };

  const handlePressOut = () => {
    press.set(reduced ? 0 : withSpring(0, springs.press));
  };

  // Vibration au relâchement : seulement si l'action part vraiment
  const handlePress = () => {
    if (isRelief && !silent) tap();
    onPress();
  };

  const spinnerColor = colors[LABEL_TONE[variant]];

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
        style={[isRelief && styles.reliefWrap, disabled && !loading && styles.disabled]}
      >
        {relief ? (
          <>
            {/* Tranche : visible sous la face, recouverte quand la face s'enfonce */}
            <View style={[styles.edge, { backgroundColor: colors[relief.edge] }]} />
            <Animated.View style={[styles.base, styles.primaryFace, { backgroundColor: colors[relief.face] }, faceStyle]}>
              {content}
            </Animated.View>
          </>
        ) : (
          <Animated.View
            style={[
              styles.base,
              isText ? styles.textFace : [styles.secondaryFace, { borderColor: colors.controlBorder }],
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
