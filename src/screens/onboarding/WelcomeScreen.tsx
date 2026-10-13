import { useRouter } from 'expo-router';
import { ReactNode, useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, Ellipse, Path, RadialGradient, Stop } from 'react-native-svg';

import { StatusBarShade } from '@/src/components/common/AppBackground';
import AppText from '@/src/components/common/AppText';
import Button from '@/src/components/common/Button';
import GroundShadow from '@/src/components/common/GroundShadow';
import Pill from '@/src/components/common/Pill';
import { SpeechBubble } from '@/src/components/common/ValBubble';
import ValFullBody, { VAL_FACES, valPose } from '@/src/components/common/ValFullBody';
import { LOGO, LOGO_RATIO } from '@/src/constants/brand';
import { loops, springs } from '@/src/constants/motion';
import { bubble, fonts, palette, space, titleLetterSpacing, withOpacity } from '@/src/constants/style/Style';
import { useApi } from '@/src/context/ApiContext';
import { useTheme } from '@/src/context/ThemeContext';
import { onboardingStore } from '@/src/state/onboarding';
import { tailLength } from '@/src/utils/speechBubble';
import { track } from '@/src/utils/track';
import { trustPills } from '@/src/utils/welcome';

const LOGO_HEIGHT = 28;
const TITLE_SIZE = 38;
const VAL_LINE = 'Salut ! Moi, c’est Val.';
// Espace fixe entre la scène et le titre
const STAGE_TO_TITLE = space[6];

// Scène de Val : la bulle au-dessus de sa tête, Val en pied, sa lueur au sol.
// Val mesure 180 de large sur un grand écran et se réduit (jusqu'à 55 %) pour
// que scène et texte tiennent au-dessus des boutons, iPhone SE compris.
const VAL_WIDTH = 180;
const VAL_RATIO = valPose('saut').ratio;
const VAL_HEIGHT = VAL_WIDTH / VAL_RATIO;
const FACE = VAL_FACES.saut;
// Haut du chapeau, en fraction de l'image (la pointe s'arrête avant)
const HEAD_TOP = 0.08;
const MIN_SCALE = 0.55;
const BUBBLE_HEIGHT_GUESS = bubble.lineHeight + bubble.paddingY * 2;
// Écart entre le bas de la bulle et le haut de l'image de Val (poings)
const BUBBLE_GAP = 10;
const GROUND = 18; // place sous les pieds pour la lueur
// Hauteur estimée du reste de l'écran (logo, textes, boutons, marges),
// grossie avec la taille du texte
const RESERVED = 500;
const RESERVED_PER_FONT_SCALE = 180;
const HALO = 300; // diamètre du halo projecteur
const GLOW = { width: 200, height: 26 }; // lueur au sol
const SHADOW = { width: 160, height: 14 }; // ombre portée
// Étoiles : position en fractions de l'image de Val (hors de la bulle), taille
const STARS = [
  { x: -0.38, y: 0.6, size: 10 },
  { x: 1.28, y: 0.42, size: 8 },
  { x: 1.12, y: 0.9, size: 12 },
  { x: -0.22, y: 0.95, size: 7 },
  { x: 1.4, y: 0.72, size: 6 },
  { x: -0.12, y: 0.3, size: 8 },
] as const;

// Entrée animée, 1,2 s au plus : halo, Val qui saute, bulle, puis la cascade
const HALO_FADE = 300;
const BUBBLE_DELAY = 300;
const CASCADE_START = 380;
const CASCADE_STEP = 80;
const REVEAL_FADE = 260;
const REVEAL_RISE = 8;
// Ensuite, tout vit doucement : étoiles, halo
const LIFE_START = 1200;

// Pseudo-aléatoire stable (mêmes rythmes à chaque ouverture)
function seeded(i: number, salt: number): number {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

// Bienvenue : le tout premier écran, sans compte. Val mis en scène (halo,
// lueur au sol, étoiles, bulle collée à sa tête), la promesse, deux pastilles
// de confiance, puis « Commencer » dans la zone du pouce. Scène et texte sont
// centrés ensemble au-dessus des boutons. Les boutons répondent dès la
// première image, même pendant l'entrée animée.
export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const { get } = useApi();
  const { width, height, fontScale } = useWindowDimensions();
  const [words, setWords] = useState<number | null>(null);

  useEffect(() => {
    track('bienvenue_vue');
  }, []);

  // Vrai nombre de mots du dictionnaire (route publique) ; indisponible : la
  // pastille ne s'affiche pas
  useEffect(() => {
    let active = true;
    get('/dictionary')
      .then((data: unknown) => {
        if (active && Array.isArray(data)) setWords(data.length);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [get]);

  const start = () => {
    track('bienvenue_commencer');
    onboardingStore.update({ step: 'prenom' });
    router.push('/bienvenue/prenom');
  };

  const login = () => {
    track('bienvenue_deja_compte');
    router.push('/client/login');
  };

  // Échelle de la scène : ce qui reste une fois le reste posé
  const reserved = RESERVED + Math.max(0, fontScale - 1) * RESERVED_PER_FONT_SCALE;
  const available = height - insets.top - insets.bottom - reserved - BUBBLE_HEIGHT_GUESS - BUBBLE_GAP;
  const scale = Math.min(1, Math.max(MIN_SCALE, available / (VAL_HEIGHT + GROUND)));

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + space[3] }]}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        <Image
          source={LOGO}
          resizeMode="contain"
          style={styles.logo}
          accessible
          accessibilityRole="image"
          accessibilityLabel="Valtheria"
        />

        {/* Scène + texte, centrés ensemble dans la place au-dessus des boutons */}
        <View style={styles.middle}>
          <ValStage scale={scale} width={width} />

          <View style={styles.texts}>
            <Reveal delay={CASCADE_START}>
              <AppText maxFontSizeMultiplier={1.3} style={styles.title} accessibilityRole="header">
                L’argent, <AppText style={[styles.title, styles.italic, { color: colors.gold }]}>enfin</AppText>
                {'\n'}expliqué.
              </AppText>
            </Reveal>
            <Reveal delay={CASCADE_START + CASCADE_STEP}>
              <AppText variant="body" tone="subtitle" style={styles.center}>
                Budget, épargne, placements : je t’explique tout, simplement, en jouant.
              </AppText>
            </Reveal>
            <Reveal delay={CASCADE_START + CASCADE_STEP * 2}>
              <View style={styles.pills}>
                {trustPills(words).map((pill) => (
                  <Pill
                    key={pill.key}
                    size="md"
                    icon={pill.icon}
                    label={pill.label}
                    background={withOpacity(colors.text, 0.05)}
                    borderColor={colors.border}
                    color={colors.text}
                    iconColor={colors.gold}
                  />
                ))}
              </View>
            </Reveal>
          </View>
        </View>
      </ScrollView>

      {/* Zone du pouce : toujours visible, touchable dès la première image */}
      <Reveal delay={CASCADE_START + CASCADE_STEP * 3} rise={false}>
        <View style={[styles.footer, { paddingBottom: insets.bottom + space[2] }]}>
          <Button label="Commencer" onPress={start} />
          <AppText variant="caption" tone="subtitle" style={styles.center}>
            Une leçon d’une minute, sans inscription.
          </AppText>
          <Button variant="text" label="J’ai déjà un compte" onPress={login} />
        </View>
      </Reveal>

      {/* Rien ne passe sous la barre d'état en défilant */}
      <StatusBarShade tab="apprendre" />
    </View>
  );
}

// Val mis en scène : bulle collée au-dessus de sa tête (pointe vers sa
// bouche), halo projecteur qui pulse, Val qui respire, lueur et ombre au sol,
// étoiles qui scintillent. Décoratif pour le lecteur d'écran, sauf la bulle,
// lue « Val : … ».
function ValStage({ scale, width }: { scale: number; width: number }) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const reduced = useReducedMotion();
  const [bubbleSize, setBubbleSize] = useState({ width: 0, height: BUBBLE_HEIGHT_GUESS });

  const valW = Math.round(VAL_WIDTH * scale);
  const valH = Math.round(VAL_HEIGHT * scale);
  const valLeft = (width - valW) / 2;
  const valTop = bubbleSize.height + BUBBLE_GAP;
  const stageHeight = valTop + valH + GROUND * scale;
  const mouth = { x: valLeft + valW * FACE.mouthX, y: valTop + valH * FACE.mouthY };

  // Bulle centrée sur la bouche, jamais hors de l'écran ; pointe vers la bouche
  const margin = space[4];
  const bubbleLeft = bubbleSize.width
    ? Math.min(width - margin - bubbleSize.width, Math.max(margin, mouth.x - bubbleSize.width / 2))
    : margin;
  const edge = bubble.radius + bubble.tailBase / 2;
  const anchor = bubbleSize.width ? Math.min(bubbleSize.width - edge, Math.max(edge, mouth.x - bubbleLeft)) : edge;
  const tailBase = { x: bubbleLeft + anchor, y: bubbleSize.height };
  const aim = { x: mouth.x - tailBase.x, y: mouth.y - tailBase.y };
  const length = tailLength(BUBBLE_GAP + valH * HEAD_TOP);

  const halo = HALO * scale;
  const haloCenterY = valTop + valH * 0.45;
  const feetY = valTop + valH * 0.97;
  const glowW = GLOW.width * scale;
  const glowH = GLOW.height * scale;

  // Le halo s'allume, puis pulse lentement (0,8 → 1)
  const haloOpacity = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (reduced) return;
    const half = { duration: loops.haloPulse / 2, easing: Easing.inOut(Easing.sin) };
    haloOpacity.set(
      withSequence(
        withTiming(1, { duration: HALO_FADE, easing: Easing.out(Easing.quad) }),
        withDelay(LIFE_START - HALO_FADE, withRepeat(withSequence(withTiming(0.8, half), withTiming(1, half)), -1))
      )
    );
  }, [reduced, haloOpacity]);
  const haloStyle = useAnimatedStyle(() => ({ opacity: haloOpacity.get() }));

  return (
    <View style={[styles.stage, { height: stageHeight }]}>
      <Animated.View
        style={[styles.abs, { left: width / 2 - halo / 2, top: haloCenterY - halo / 2, width: halo, height: halo }, haloStyle]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
      >
        <Svg width={halo} height={halo}>
          <Defs>
            <RadialGradient id="welcomeHalo" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={colors.gold} stopOpacity={0.22} />
              <Stop offset="0.45" stopColor={colors.gold} stopOpacity={0.06} />
              <Stop offset="0.7" stopColor={colors.gold} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Ellipse cx={halo / 2} cy={halo / 2} rx={halo / 2} ry={halo / 2} fill="url(#welcomeHalo)" />
        </Svg>
      </Animated.View>

      <View style={styles.abs} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none">
        {/* Lueur dorée au sol, puis l'ombre portée sous les pieds */}
        <Svg width={glowW} height={glowH} style={[styles.abs, { left: width / 2 - glowW / 2, top: feetY - glowH / 2 }]}>
          <Defs>
            <RadialGradient id="welcomeGlow" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={colors.gold} stopOpacity={0.25} />
              <Stop offset="0.7" stopColor={colors.gold} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Ellipse cx={glowW / 2} cy={glowH / 2} rx={glowW / 2} ry={glowH / 2} fill="url(#welcomeGlow)" />
        </Svg>
        <GroundShadow
          width={SHADOW.width * scale}
          height={SHADOW.height * scale}
          opacity={0.6}
          left={width / 2 - (SHADOW.width * scale) / 2}
          top={feetY - (SHADOW.height * scale) / 2}
        />
      </View>

      <View
        style={[styles.abs, { left: valLeft, top: valTop }]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
      >
        <ValFullBody pose="saut" width={valW} height={0} breathe />
      </View>

      {STARS.map((star, i) => (
        <Star
          key={i}
          index={i}
          left={valLeft + valW * star.x - star.size / 2}
          top={valTop + valH * star.y - star.size / 2}
          size={star.size}
        />
      ))}

      {/* Bulle collée au-dessus de la tête : la pointe s'arrête à 55 % de
          l'écart jusqu'au chapeau, dirigée vers la bouche */}
      <View style={[styles.abs, { left: bubbleLeft, top: 0, opacity: bubbleSize.width ? 1 : 0 }]}>
        <SpeechBubble
          text={VAL_LINE}
          side="bottom"
          anchor={anchor}
          aim={aim}
          tailLength={length}
          delay={BUBBLE_DELAY}
          maxWidth={width - margin * 2}
          onLayout={(w, h) => {
            if (w !== bubbleSize.width || h !== bubbleSize.height) setBubbleSize({ width: w, height: h });
          }}
        />
      </View>
    </View>
  );
}

// Étoile dorée à quatre branches qui scintille (taille et opacité), chacune à
// son rythme, avec des décalages stables. Animations réduites : fixe.
function Star({ index, left, top, size }: { index: number; left: number; top: number; size: number }) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const reduced = useReducedMotion();
  const twinkle = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    if (reduced) {
      twinkle.set(1);
      return;
    }
    const half = 900 + Math.round(seeded(index, 1) * 1400);
    const offset = Math.round(seeded(index, 2) * 1200);
    const curve = { easing: Easing.inOut(Easing.sin) };
    twinkle.set(
      withSequence(
        withTiming(1, { duration: HALO_FADE }),
        withDelay(
          LIFE_START - HALO_FADE + offset,
          withRepeat(withSequence(withTiming(0, { duration: half, ...curve }), withTiming(1, { duration: half, ...curve })), -1)
        )
      )
    );
  }, [reduced, index, twinkle]);

  const style = useAnimatedStyle(() => {
    const t = twinkle.get();
    return { opacity: 0.35 + 0.55 * t, transform: [{ scale: 0.65 + 0.35 * t }] };
  });

  // Quatre branches fines, centre pincé
  const c = size / 2;
  const w = size * 0.14;
  const d = `M${c} 0 Q${c + w} ${c - w} ${size} ${c} Q${c + w} ${c + w} ${c} ${size} Q${c - w} ${c + w} 0 ${c} Q${c - w} ${c - w} ${c} 0 Z`;

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.abs, { left, top, width: size, height: size }, style]}
    >
      <Svg width={size} height={size}>
        <Path d={d} fill={colors.gold} />
      </Svg>
    </Animated.View>
  );
}

// Apparition en cascade (fondu et légère montée) après `delay`. Ne bloque
// jamais le toucher : le contenu est touchable dès la première image.
// Animations réduites : affiché directement.
function Reveal({ delay, rise = true, children }: { delay: number; rise?: boolean; children: ReactNode }) {
  const reduced = useReducedMotion();
  const opacity = useSharedValue(reduced ? 1 : 0);
  const offset = useSharedValue(reduced || !rise ? 0 : REVEAL_RISE);

  useEffect(() => {
    if (reduced) return;
    opacity.set(withDelay(delay, withTiming(1, { duration: REVEAL_FADE })));
    if (rise) offset.set(withDelay(delay, withSpring(0, springs.enter)));
  }, [reduced, delay, rise, opacity, offset]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.get(), transform: [{ translateY: offset.get() }] }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingBottom: space[3],
  },
  logo: {
    alignSelf: 'center',
    height: LOGO_HEIGHT,
    width: LOGO_HEIGHT * LOGO_RATIO,
  },
  // Scène + texte centrés verticalement, 24 entre la scène et le titre
  middle: {
    flexGrow: 1,
    justifyContent: 'center',
    gap: STAGE_TO_TITLE,
    paddingTop: space[3],
  },
  stage: {
    alignSelf: 'stretch',
  },
  abs: {
    position: 'absolute',
  },
  texts: {
    paddingHorizontal: space[6],
    alignItems: 'center',
    gap: space[3],
  },
  title: {
    fontFamily: fonts.title,
    fontSize: TITLE_SIZE,
    lineHeight: 43,
    letterSpacing: titleLetterSpacing(TITLE_SIZE),
    textAlign: 'center',
  },
  italic: {
    fontFamily: fonts.titleItalic,
  },
  center: {
    textAlign: 'center',
  },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: space[2],
    marginTop: space[1],
  },
  footer: {
    paddingHorizontal: space[5],
    paddingTop: space[3],
    gap: space[1],
  },
});
