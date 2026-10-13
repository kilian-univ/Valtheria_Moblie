import { Ionicons } from '@expo/vector-icons';
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
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';

import { StatusBarShade } from '@/src/components/common/AppBackground';
import AppText from '@/src/components/common/AppText';
import Button from '@/src/components/common/Button';
import GroundShadow from '@/src/components/common/GroundShadow';
import { ValSpeechBubble } from '@/src/components/common/ValBubble';
import ValFullBody from '@/src/components/common/ValFullBody';
import { LOGO, LOGO_RATIO } from '@/src/constants/brand';
import { springs } from '@/src/constants/motion';
import { fonts, palette, radius, space, titleLetterSpacing, withOpacity } from '@/src/constants/style/Style';
import { useApi } from '@/src/context/ApiContext';
import { useTheme } from '@/src/context/ThemeContext';
import { onboardingStore } from '@/src/state/onboarding';
import { track } from '@/src/utils/track';
import { trustPills } from '@/src/utils/welcome';

const LOGO_HEIGHT = 28;
const TITLE_SIZE = 38;
const VAL_LINE = 'Salut ! Moi, c’est Val.';
const PILL_HEIGHT = 32;

// Scène de Val, à l'échelle de la maquette (330 de haut sur un écran de 390) :
// elle se réduit sur petit écran (iPhone SE) pour que tout tienne sans vide
const STAGE = 330;
const STAGE_MIN = 190;
// Hauteur prise par le reste de l'écran (logo, textes, boutons, marges),
// grossie avec la taille du texte
const RESERVED = 470;
const RESERVED_PER_FONT_SCALE = 160;
const HALO = 300; // diamètre du halo projecteur
const HALO_TOP = 10;
const VAL_WIDTH = 180;
const VAL_TOP = 44;
const GLOW = { width: 200, height: 26, top: 268 }; // lueur au sol
const SHADOW = { width: 160, height: 14, top: 276 }; // ombre portée
const BUBBLE_MAX = 172;
// Éclats : écart au centre et hauteur (unités de la maquette), taille, opacité
const SPARKS = [
  { dx: -125, y: 190, size: 4, opacity: 0.7 },
  { dx: 123, y: 160, size: 3, opacity: 0.6 },
  { dx: 105, y: 300, size: 5, opacity: 0.5 },
  { dx: -135, y: 286, size: 3, opacity: 0.5 },
  { dx: 145, y: 250, size: 2, opacity: 0.8 },
  { dx: -85, y: 120, size: 2, opacity: 0.6 },
] as const;

// Entrée animée, 1,2 s au plus : halo, Val qui saute, bulle, puis la cascade
const HALO_FADE = 300;
const BUBBLE_DELAY = 300;
const CASCADE_START = 380;
const CASCADE_STEP = 80;
const REVEAL_FADE = 260;
const REVEAL_RISE = 8;
// Les éclats scintillent ensuite, très doucement
const TWINKLE_START = 1200;

// Bienvenue : le tout premier écran, sans compte. Val mis en scène (halo,
// lueur au sol, éclats), la promesse, deux pastilles de confiance, puis
// « Commencer » dans la zone du pouce. Les boutons répondent dès la première
// image, même pendant l'entrée animée.
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

  const reserved = RESERVED + Math.max(0, fontScale - 1) * RESERVED_PER_FONT_SCALE;
  const stage = Math.round(Math.min(STAGE, Math.max(STAGE_MIN, height - insets.top - insets.bottom - reserved)));

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

        <ValStage size={stage} width={width} />

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
                <View
                  key={pill.key}
                  style={[styles.pill, { backgroundColor: withOpacity(colors.text, 0.05), borderColor: colors.border }]}
                  accessible
                  accessibilityLabel={pill.label}
                >
                  <Ionicons name={pill.icon} size={15} color={colors.gold} />
                  <AppText variant="caption" maxFontSizeMultiplier={1.3}>
                    {pill.label}
                  </AppText>
                </View>
              ))}
            </View>
          </Reveal>
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

// Val mis en scène : halo projecteur, lueur au sol et ombre, éclats qui
// scintillent, bulle au-dessus à droite de sa tête. Décoratif pour le lecteur
// d'écran, sauf la bulle, lue comme une phrase.
function ValStage({ size, width }: { size: number; width: number }) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const reduced = useReducedMotion();
  const s = size / STAGE;
  const center = width / 2;
  const halo = HALO * s;
  const valWidth = Math.round(VAL_WIDTH * s);
  const glowW = GLOW.width * s;
  const glowH = GLOW.height * s;

  // Le halo s'allume
  const haloOpacity = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (!reduced) haloOpacity.set(withTiming(1, { duration: HALO_FADE, easing: Easing.out(Easing.quad) }));
  }, [reduced, haloOpacity]);
  const haloStyle = useAnimatedStyle(() => ({ opacity: haloOpacity.get() }));

  return (
    <View style={[styles.stage, { height: size }]}>
      <Animated.View
        style={[styles.abs, { left: center - halo / 2, top: HALO_TOP * s, width: halo, height: halo }, haloStyle]}
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
        <Svg width={glowW} height={glowH} style={[styles.abs, { left: center - glowW / 2, top: GLOW.top * s }]}>
          <Defs>
            <RadialGradient id="welcomeGlow" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={colors.gold} stopOpacity={0.25} />
              <Stop offset="0.7" stopColor={colors.gold} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Ellipse cx={glowW / 2} cy={glowH / 2} rx={glowW / 2} ry={glowH / 2} fill="url(#welcomeGlow)" />
        </Svg>
        <GroundShadow
          width={SHADOW.width * s}
          height={SHADOW.height * s}
          opacity={0.6}
          left={center - (SHADOW.width * s) / 2}
          top={SHADOW.top * s}
        />
      </View>

      <View
        style={[styles.abs, { left: center - valWidth / 2, top: VAL_TOP * s }]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
      >
        <ValFullBody pose="saut" width={valWidth} height={0} />
      </View>

      {SPARKS.map((spark, i) => (
        <Spark key={i} index={i} left={center + spark.dx * s} top={spark.y * s} size={spark.size} opacity={spark.opacity} />
      ))}

      <View
        style={[styles.abs, { left: center + s, top: 0, maxWidth: Math.min(BUBBLE_MAX, center - space[4]) }]}
        accessible
        accessibilityLabel={`Val : ${VAL_LINE}`}
      >
        <ValSpeechBubble
          text={VAL_LINE}
          tail="bottomLeft"
          bordered
          delay={BUBBLE_DELAY}
          radius={16}
          borderColor={withOpacity(colors.gold, 0.3)}
        />
      </View>
    </View>
  );
}

// Éclat doré qui scintille très doucement en boucle, chacun à son rythme.
// Animations réduites : fixe.
function Spark({ index, left, top, size, opacity }: { index: number; left: number; top: number; size: number; opacity: number }) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const reduced = useReducedMotion();
  const value = useSharedValue(reduced ? opacity : 0);

  useEffect(() => {
    if (reduced) {
      value.set(opacity);
      return;
    }
    const half = 1300 + index * 230;
    const curve = { easing: Easing.inOut(Easing.sin) };
    value.set(
      withSequence(
        withTiming(opacity, { duration: HALO_FADE }),
        withDelay(
          TWINKLE_START - HALO_FADE + index * 140,
          withRepeat(
            withSequence(withTiming(opacity * 0.35, { duration: half, ...curve }), withTiming(opacity, { duration: half, ...curve })),
            -1
          )
        )
      )
    );
  }, [reduced, opacity, index, value]);

  const style = useAnimatedStyle(() => ({ opacity: value.get() }));
  return (
    <Animated.View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.abs, { left, top, width: size, height: size, borderRadius: size / 2, backgroundColor: colors.gold }, style]}
    />
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
  // Logo, scène et textes répartis sur toute la hauteur disponible
  content: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingBottom: space[3],
    gap: space[3],
  },
  logo: {
    alignSelf: 'center',
    height: LOGO_HEIGHT,
    width: LOGO_HEIGHT * LOGO_RATIO,
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
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: PILL_HEIGHT,
    paddingHorizontal: space[3],
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  footer: {
    paddingHorizontal: space[5],
    paddingTop: space[3],
    gap: space[1],
  },
});
