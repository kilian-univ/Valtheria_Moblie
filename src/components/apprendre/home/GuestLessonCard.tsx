import { Ionicons } from '@expo/vector-icons';
import { ComponentProps } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import AppText from '@/src/components/common/AppText';
import GoldHalo from '@/src/components/common/GoldHalo';
import ValFullBody, { ValPose } from '@/src/components/common/ValFullBody';
import { DECOR_IMAGES } from '@/src/constants/decorImages';
import { springs } from '@/src/constants/motion';
import {
  fonts,
  ModuleColors,
  palette,
  reliefDepth,
  size,
  softShadow,
  space,
  titleLetterSpacing,
  withOpacity,
} from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import type { HomeCard, HomeCardAction } from '@/src/utils/discoveryHome';
import { tap } from '@/src/utils/haptics';
import { universeDecor } from '@/src/utils/universes';

const RADIUS = 22;
const DEPTH = 8;
const MIN_HEIGHT = 250;
const PAD = 18;
const TITLE_SIZE = 26;
// Val sort de la carte par le haut, ancré à son bord supérieur (la hauteur
// de la carte ne change rien à son débordement) ; il reste coupé en bas et à
// droite. top : haut de l'image au-dessus de la carte (marges transparentes
// comprises : le chapeau dépasse d'environ 32 px pour la pose fier).
const VAL_POSES: Record<'saut' | 'fier', { width: number; right: number; top: number }> = {
  saut: { width: 260, right: -55, top: 56 },
  fier: { width: 230, right: -62, top: 50 },
};
// Zone de Val au-dessus de la carte : de quoi contenir l'image entière
const VAL_ZONE = 64;
// Écart entre le haut de l’image de Val et le sous-titre (la marge transparente
// de l’image s’y ajoute : la tête ne touche jamais le sous-titre)
const VAL_CLEARANCE = 4;
// Espace entre le sous-titre et la carte dans la pile de l'accueil
const STACK_GAP = space[6];
// Place gardée à Val à droite des textes : ils ne passent jamais sous lui
const TEXT_RIGHT = 175;
// Lueur de la couleur de l'univers derrière la carte, sur le fond
const GLOW_OUTSET = 44;
const GLOW_OPACITY = 0.2;
// Décor peint de l'univers, en grand dans la carte, en bas à gauche
const DECOR_SIZE = 190;
const DECOR_OPACITY = 0.12;
const BADGE_HEIGHT = 26;
const DOT = 9;
const BUTTON_HEIGHT = 46;
const BUTTON_RADIUS = 14;
const SINK_DURATION = 80; // comme le bouton principal

// Libellés lus par le lecteur d'écran (les capitales s'épellent parfois)
const SPOKEN: Record<HomeCardAction, string> = {
  'autre-sujet': 'Un autre sujet',
  'creer-compte': 'Créer mon compte',
  reprendre: 'Reprendre la leçon',
  commencer: 'Commencer la leçon',
  rejouer: 'Rejouer une leçon',
};

const ICONS: Partial<Record<HomeCardAction, ComponentProps<typeof Ionicons>['name']>> = {
  'autre-sujet': 'swap-horizontal',
  rejouer: 'refresh',
};

type GuestLessonCardProps = {
  card: HomeCard;
  // Couleur de l'univers de l'objectif (six sur six : la carte passe en or)
  tint: ModuleColors;
  universeSlug: string;
  onAction: (action: HomeCardAction) => void;
  // « J'ai déjà un compte », sous « CRÉER MON COMPTE »
  onLogin: () => void;
};

// Grande carte de l'accueil sans compte : relief à la couleur de l'univers
// (tranche de 8, reflet, ombre douce, lueur derrière, décor peint en fond),
// Val qui en sort par le haut, pastille, titre, phrase, progression des six
// sujets, bouton ivoire en relief. Six sur six : carte dorée, Val fier.
export default function GuestLessonCard({ card, tint, universeSlug, onAction, onLogin }: GuestLessonCardProps) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const six = card.state === 'six';
  const look = six ? { face: colors.gold, deep: colors.goldDeep, onFace: colors.onGold } : tint;
  const ink = look.onFace;
  const pose: ValPose = six ? 'fier' : 'saut';
  const val = VAL_POSES[six ? 'fier' : 'saut'];
  const spokenProgress = card.progress ? ` ${card.progress.line}` : '';

  // Place de la tête de Val au-dessus de la carte, sans toucher le sous-titre
  const marginTop = Math.max(0, val.top + VAL_CLEARANCE - STACK_GAP);

  return (
    <View style={[styles.wrap, { marginTop }]}>
      {/* Lueur de la couleur de la carte, sur le fond */}
      <View style={styles.glow} pointerEvents="none">
        <GoldHalo color={withOpacity(look.face, GLOW_OPACITY)} />
      </View>

      <View style={[styles.edge, { backgroundColor: look.deep, boxShadow: softShadow(colors.groundShadow) }]} />
      <View style={[styles.face, { backgroundColor: look.face }]}>
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
        {six ? (
          // Assombrissement léger derrière Val : le trophée et les détails
          // dorés se détachent du fond doré
          <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
            <Defs>
              <RadialGradient id="guestCardShade" cx="78%" cy="48%" r="42%" fx="78%" fy="48%">
                <Stop offset="0" stopColor="#000000" stopOpacity={0.18} />
                <Stop offset="1" stopColor="#000000" stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#guestCardShade)" />
          </Svg>
        ) : null}

        {six ? null : (
          <Image
            source={DECOR_IMAGES[universeDecor(universeSlug)]}
            resizeMode="contain"
            style={styles.decor}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          />
        )}

        <View
          style={styles.texts}
          accessible
          accessibilityLabel={`${spokenBadge(card.badge)}. ${card.title}. ${card.text}${spokenProgress}`}
        >
          <View style={[styles.badge, { backgroundColor: withOpacity(ink, 0.14) }]}>
            {card.state === 'terminee' || six ? <Ionicons name={six ? 'trophy' : 'checkmark'} size={14} color={ink} /> : null}
            <AppText maxFontSizeMultiplier={1.3} style={[styles.badgeText, { color: ink }]}>
              {card.badge}
            </AppText>
          </View>
          <AppText maxFontSizeMultiplier={1.4} style={[styles.title, { color: ink }]} accessibilityRole="header">
            {card.title}
          </AppText>
          <AppText style={[styles.text, { color: ink }]}>{card.text}</AppText>
          {card.progress ? (
            <>
              <AppText style={[styles.progress, { color: ink }]}>{card.progress.line}</AppText>
              <View style={styles.dots}>
                {card.progress.dots.map((done, i) => (
                  <View
                    key={i}
                    style={[
                      styles.dot,
                      done ? { backgroundColor: colors.gold, borderColor: colors.goldDeep } : { borderColor: withOpacity(ink, 0.45) },
                    ]}
                  />
                ))}
              </View>
            </>
          ) : null}
        </View>

        <IvoryButton
          label={card.actionLabel}
          spokenLabel={SPOKEN[card.action]}
          icon={ICONS[card.action]}
          color={look.deep}
          ivory={colors.ivory}
          onPress={() => onAction(card.action)}
        />
        {card.action === 'creer-compte' ? (
          <Pressable onPress={onLogin} accessibilityRole="link" accessibilityLabel="J’ai déjà un compte, se connecter" style={styles.login}>
            <AppText style={[styles.loginText, { color: ink }]}>J’ai déjà un compte</AppText>
          </Pressable>
        ) : null}
      </View>

      {/* Val, par-dessus : la zone dépasse au-dessus de la carte et suit ses
          coins du bas, il n'est coupé qu'en bas et à droite */}
      <View style={styles.valZone} pointerEvents="none">
        <View style={{ position: 'absolute', right: val.right, top: VAL_ZONE - val.top }}>
          <ValFullBody pose={pose} width={val.width} height={0} shadow={six} />
        </View>
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
  glow: {
    position: 'absolute',
    left: -GLOW_OUTSET,
    right: -GLOW_OUTSET,
    top: -GLOW_OUTSET,
    bottom: -GLOW_OUTSET,
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
  decor: {
    position: 'absolute',
    left: -space[6],
    bottom: -space[6],
    width: DECOR_SIZE,
    height: DECOR_SIZE,
    opacity: DECOR_OPACITY,
  },
  valZone: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: -VAL_ZONE,
    bottom: DEPTH,
    overflow: 'hidden',
    borderBottomLeftRadius: RADIUS,
    borderBottomRightRadius: RADIUS,
    borderCurve: 'continuous',
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
  progress: {
    fontFamily: fonts.bodySemibold,
    fontSize: 14,
    lineHeight: 20,
    marginTop: space[2],
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
    marginTop: space[2],
  },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    borderWidth: 1.5,
  },
  login: {
    alignSelf: 'flex-start',
    minHeight: size.tapMin,
    justifyContent: 'center',
    marginTop: -space[3],
    marginBottom: -space[2],
  },
  loginText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 14,
    lineHeight: 20,
    textDecorationLine: 'underline',
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
