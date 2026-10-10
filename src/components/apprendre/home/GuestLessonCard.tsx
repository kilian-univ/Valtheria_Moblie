import { Ionicons } from '@expo/vector-icons';
import { ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import AppText from '@/src/components/common/AppText';
import ValFullBody from '@/src/components/common/ValFullBody';
import { springs } from '@/src/constants/motion';
import { fonts, ModuleColors, palette, reliefDepth, space, titleLetterSpacing, withOpacity } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import type { HomeCard, HomeCardAction } from '@/src/utils/discoveryHome';
import { tap } from '@/src/utils/haptics';

const RADIUS = 22;
const DEPTH = 8;
const MIN_HEIGHT = 250;
const PAD = 18;
const TITLE_SIZE = 26;
// Val dépasse en bas à droite, coupé par le bord de la carte
const VAL_WIDTH = 160;
const VAL_RIGHT = -14;
const VAL_BOTTOM = -36;
// Place laissée à Val à droite des textes
const TEXT_RIGHT = 140;
const BADGE_HEIGHT = 26;
const BUTTON_HEIGHT = 46;
const BUTTON_RADIUS = 14;
const SINK_DURATION = 80; // comme le bouton principal

// Libellés lus par le lecteur d'écran (les capitales s'épellent parfois)
const SPOKEN: Record<HomeCardAction, string> = {
  'autre-sujet': 'Un autre sujet',
  'creer-compte': 'Créer mon compte',
  reprendre: 'Reprendre la leçon',
  commencer: 'Commencer la leçon',
};

const ICONS: Partial<Record<HomeCardAction, ComponentProps<typeof Ionicons>['name']>> = {
  'autre-sujet': 'swap-horizontal',
};

type GuestLessonCardProps = {
  card: HomeCard;
  tint: ModuleColors;
  onAction: (action: HomeCardAction) => void;
};

// Grande carte de l'accueil sans compte : relief à la couleur de l'univers de
// l'objectif (tranche de 8, reflet en haut à gauche), Val qui saute en bas à
// droite, pastille, titre de la leçon, phrase, bouton ivoire en relief.
export default function GuestLessonCard({ card, tint, onAction }: GuestLessonCardProps) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const ink = tint.onFace;

  return (
    <View style={styles.wrap}>
      <View style={[styles.edge, { backgroundColor: tint.deep }]} />
      <View style={[styles.face, { backgroundColor: tint.face }]}>
        {/* Reflet radial, en haut à gauche */}
        <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
          <Defs>
            <RadialGradient id="guestCardShine" cx="25%" cy="15%" r="45%" fx="25%" fy="15%">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.28} />
              <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#guestCardShine)" />
        </Svg>

        <View style={styles.val} pointerEvents="none">
          <ValFullBody pose="saut" width={VAL_WIDTH} height={0} />
        </View>

        <View style={styles.texts} accessible accessibilityLabel={`${spokenBadge(card.badge)}. ${card.title}. ${card.text}`}>
          <View style={[styles.badge, { backgroundColor: withOpacity(ink, 0.14) }]}>
            {card.state === 'terminee' ? <Ionicons name="checkmark" size={14} color={ink} /> : null}
            <AppText maxFontSizeMultiplier={1.3} style={[styles.badgeText, { color: ink }]}>
              {card.badge}
            </AppText>
          </View>
          <AppText maxFontSizeMultiplier={1.4} style={[styles.title, { color: ink }]} accessibilityRole="header">
            {card.title}
          </AppText>
          <AppText style={[styles.text, { color: ink }]}>{card.text}</AppText>
        </View>

        <IvoryButton
          label={card.actionLabel}
          spokenLabel={SPOKEN[card.action]}
          icon={ICONS[card.action]}
          color={tint.deep}
          ivory={colors.ivory}
          onPress={() => onAction(card.action)}
        />
      </View>
    </View>
  );
}

// « LEÇON TERMINÉE » → « Leçon terminée » pour le lecteur d’écran
function spokenBadge(badge: string): string {
  return badge.charAt(0) + badge.slice(1).toLowerCase();
}

// Bouton ivoire en relief, posé sur la carte : la face s'enfonce à l'appui
function IvoryButton({
  label,
  spokenLabel,
  icon,
  color,
  ivory,
  onPress,
}: {
  label: string;
  spokenLabel: string;
  icon?: ComponentProps<typeof Ionicons>['name'];
  color: string;
  ivory: string;
  onPress: () => void;
}) {
  const reduced = useReducedMotion();
  const press = useSharedValue(0);
  const faceStyle = useAnimatedStyle(() => ({ transform: [{ translateY: press.get() * reliefDepth }] }));

  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      onPressIn={() => press.set(reduced ? 1 : withTiming(1, { duration: SINK_DURATION }))}
      onPressOut={() => press.set(reduced ? 0 : withSpring(0, springs.press))}
      accessibilityRole="button"
      accessibilityLabel={spokenLabel}
      style={styles.button}
    >
      <View style={styles.buttonEdge} />
      <Animated.View style={[styles.buttonFace, { backgroundColor: ivory }, faceStyle]}>
        {icon ? <Ionicons name={icon} size={18} color={color} /> : null}
        <AppText maxFontSizeMultiplier={1.3} style={[styles.buttonText, { color }]}>
          {label}
        </AppText>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingBottom: DEPTH,
  },
  edge: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: DEPTH,
    bottom: 0,
    borderRadius: RADIUS,
    borderCurve: 'continuous',
  },
  face: {
    minHeight: MIN_HEIGHT,
    padding: PAD,
    borderRadius: RADIUS,
    borderCurve: 'continuous',
    overflow: 'hidden',
    gap: space[4],
  },
  val: {
    position: 'absolute',
    right: VAL_RIGHT,
    bottom: VAL_BOTTOM,
  },
  texts: {
    marginRight: TEXT_RIGHT - PAD,
    alignItems: 'flex-start',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: BADGE_HEIGHT,
    paddingHorizontal: 10,
    borderRadius: BADGE_HEIGHT / 2,
  },
  badgeText: {
    fontFamily: fonts.bodyExtraBold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1,
  },
  title: {
    fontFamily: fonts.title,
    fontSize: TITLE_SIZE,
    lineHeight: 30,
    letterSpacing: titleLetterSpacing(TITLE_SIZE),
    marginTop: space[3],
  },
  text: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
    opacity: 0.8,
  },
  // Toujours en bas de la carte
  button: {
    marginTop: 'auto',
    alignSelf: 'flex-start',
    paddingBottom: reliefDepth,
  },
  buttonEdge: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: reliefDepth,
    bottom: 0,
    borderRadius: BUTTON_RADIUS,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  buttonFace: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    minHeight: BUTTON_HEIGHT,
    paddingHorizontal: PAD,
    borderRadius: BUTTON_RADIUS,
    borderCurve: 'continuous',
  },
  buttonText: {
    fontFamily: fonts.bodyExtraBold,
    fontSize: 15,
    lineHeight: 20,
  },
});
