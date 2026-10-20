import { Ionicons } from '@expo/vector-icons';
import { ComponentProps } from 'react';
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { durations, springs } from '@/src/constants/motion';
import { fonts, opacityDisabled, palette, radius, reliefDepth, size, space } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { tap } from '@/src/utils/haptics';
import AppText, { TextTone } from './AppText';

// primary, success, danger : en relief (face + tranche) ; inactifs, ils
//   passent en gris foncé neutre (jetons disabledFace / disabledEdge)
// secondary : filet, fond transparent
// contrast : plein, couleur du texte (« Continuer avec Apple »)
// text : bouton texte doré ; textDanger : rouge (action destructrice discrète)
// link : lien dans une phrase ou une carte (taille 14, sans marge,
//   souligné ou non, couleur au choix)
// goldOutline : contour or sur un fond or très léger (action secondaire
//   d'une ligne, « Réviser »)
export type ButtonVariant =
  | 'primary'
  | 'success'
  | 'danger'
  | 'secondary'
  | 'contrast'
  | 'text'
  | 'textDanger'
  | 'link'
  | 'goldOutline';

// md : hauteur 52, rayon 12 ; sm : pastille de 36 (dans une ligne)
export type ButtonSize = 'md' | 'sm';

type IconName = ComponentProps<typeof Ionicons>['name'];
const ICON_SIZE = 20;
const SMALL_HEIGHT = 36;

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
  // Icône à côté du libellé, à gauche par défaut
  icon?: IconName;
  iconPosition?: 'left' | 'right';
  // Couleur du libellé (variantes link et text) : un ton de la palette, ou
  // une couleur libre (lien posé sur une carte colorée)
  tone?: TextTone;
  color?: string;
  // Lien : souligné, et en demi-gras
  underline?: boolean;
  strong?: boolean;
  accessibilityRole?: 'button' | 'link';
  size?: ButtonSize;
  // Libellé en capitales à l'affichage (la chaîne reste en casse normale,
  // mieux lue par VoiceOver ; audit C3)
  uppercase?: boolean;
};

const LABEL_TONE: Record<ButtonVariant, TextTone> = {
  primary: 'onGold',
  success: 'background',
  danger: 'background',
  secondary: 'text',
  contrast: 'background',
  text: 'gold',
  textDanger: 'error',
  link: 'gold',
  goldOutline: 'gold',
};

const PRESSED_SCALE = 0.97; // secondary et boutons texte

export default function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  disabledReason,
  loading = false,
  size = 'md',
  fullWidth: fullWidthProp,
  accessibilityHint,
  silent = false,
  style,
  icon,
  iconPosition = 'left',
  tone,
  color,
  underline = false,
  uppercase = false,
  strong = false,
  accessibilityRole = 'button',
}: ButtonProps) {
  // Pleine largeur par défaut, sauf boutons texte, lien et petits (calculé
  // ici : une expression logique en valeur par défaut d'un paramètre fait
  // sauter le composant par le compilateur React)
  const fullWidth = fullWidthProp ?? (variant !== 'text' && variant !== 'textDanger' && variant !== 'link' && size !== 'sm');
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const reduced = useReducedMotion();
  const relief = RELIEF[variant];
  const isRelief = relief !== undefined;
  const isText = variant === 'text' || variant === 'textDanger' || variant === 'link';
  const isLink = variant === 'link';
  const labelTone = tone ?? LABEL_TONE[variant];
  // Relief inactif : gris foncé neutre (pas un or terne), libellé ivoire pâle
  const dimmedRelief = isRelief && disabled && !loading;
  const labelColor = dimmedRelief ? colors.disabledText : (color ?? colors[labelTone]);

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

  const small = size === 'sm';
  const iconNode = icon ? <Ionicons name={icon} size={small ? 14 : ICON_SIZE} color={labelColor} /> : null;
  const content = (
    <>
      {loading ? <ActivityIndicator size="small" color={labelColor} /> : null}
      {iconPosition === 'left' ? iconNode : null}
      <AppText
        variant={isLink ? 'callout' : 'button'}
        style={[
          styles.label,
          { color: labelColor },
          strong && styles.strong,
          underline && styles.underline,
          small && styles.smallLabel,
          uppercase && styles.uppercase,
        ]}
      >
        {label}
      </AppText>
      {iconPosition === 'right' ? iconNode : null}
    </>
  );

  return (
    <View style={[fullWidth && styles.fullWidth, style]}>
      <Pressable
        // Petit bouton (36 px) : zone touchable portée à 44 px (audit G16)
        hitSlop={small ? { top: 4, bottom: 4 } : undefined}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={inactive}
        accessibilityRole={accessibilityRole}
        accessibilityLabel={label}
        accessibilityHint={disabled && disabledReason ? disabledReason : accessibilityHint}
        accessibilityState={{ disabled: inactive, busy: loading }}
        // En chargement le bouton reste plein : seul l'état désactivé estompe
        style={[isRelief && styles.reliefWrap, disabled && !loading && !isRelief && styles.disabled]}
      >
        {relief ? (
          <>
            {/* Tranche : visible sous la face, recouverte quand la face s'enfonce */}
            <View
              style={[
                styles.edge,
                small && styles.smallShape,
                { backgroundColor: dimmedRelief ? colors.disabledEdge : colors[relief.edge] },
              ]}
            />
            <Animated.View
              style={[
                styles.base,
                styles.primaryFace,
                small && [styles.smallShape, styles.smallFace],
                { backgroundColor: dimmedRelief ? colors.disabledFace : colors[relief.face] },
                faceStyle,
              ]}
            >
              {content}
            </Animated.View>
          </>
        ) : (
          <Animated.View
            style={[
              styles.base,
              isText
                ? [styles.textFace, isLink && styles.linkFace]
                : variant === 'contrast'
                  ? [styles.primaryFace, { backgroundColor: colors.text }]
                  : variant === 'goldOutline'
                    ? [styles.secondaryFace, styles.goldOutline, { borderColor: colors.gold, backgroundColor: colors.goldSoft }]
                    : [styles.secondaryFace, { borderColor: colors.controlBorder }],
              small && [styles.smallShape, styles.smallFace],
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
  // Lien : aucune marge, il s'aligne sur le texte voisin
  linkFace: {
    paddingHorizontal: 0,
  },
  strong: {
    fontFamily: fonts.bodySemibold,
  },
  goldOutline: {
    borderWidth: 1.5,
  },
  // Petite pastille : 36 de haut, arrondie
  smallShape: {
    borderRadius: radius.pill,
  },
  smallFace: {
    minHeight: SMALL_HEIGHT,
    paddingHorizontal: space[4],
  },
  smallLabel: {
    fontFamily: fonts.bodyExtraBold,
    fontSize: 14,
    lineHeight: 18,
  },
  uppercase: {
    textTransform: 'uppercase',
  },
  underline: {
    textDecorationLine: 'underline',
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
