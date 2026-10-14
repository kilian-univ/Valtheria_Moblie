import { ReactNode, useEffect, useMemo, useState } from 'react';
import { Image, ImageSourcePropType, Platform, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  SensorType,
  useAnimatedSensor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { BackdropFade } from '@/src/components/common/AppBackground';
import GroundShadow from '@/src/components/common/GroundShadow';
import Sheen from '@/src/components/common/Sheen';
import { SpeechBubble } from '@/src/components/common/ValBubble';
import ValFullBody, { VAL_FACES, valPose } from '@/src/components/common/ValFullBody';
import { LOGO, LOGO_RATIO } from '@/src/constants/brand';
import { loops, springs } from '@/src/constants/motion';
import { bubble, palette, space, withOpacity } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { tailLength } from '@/src/utils/speechBubble';

// Décor du coffre-fort (bas coupé à l'import : la ligne 968 de l'original)
export const VAULT_IMAGE: ImageSourcePropType = require('@/assets/images/scenes/bienvenue-coffre.webp');
// Largeur / hauteur de l'image (écran de bienvenue : hauteur de la scène)
export const VAULT_RATIO = 1200 / 1424;
const IMAGE_RATIO = VAULT_RATIO;

// Repères dans l'image, en fractions (relevés sur le dessin)
const DOOR_LIGHT = { cx: 0.42, cy: 0.66, r: 0.3 }; // ouverture de la porte
const POOL_LIGHT = { cx: 0.47, cy: 0.9, r: 0.38 }; // flaque de lumière au sol
const FEET_Y = 0.885; // pieds de Val, au cœur de la flaque
// Le fondu vers le fond commence sous la flaque : les pieds restent nets
const FADE_FROM = 0.9;

// Val qui soulève son chapeau (« Salut ! »), 204 de haut sur une scène de 470
// (même taille à l'écran que la maquette)
const VAL_POSE = 'salut' as const;
const VAL_HEIGHT = 204;
const REFERENCE_HEIGHT = 470;
const VAL_RATIO = valPose(VAL_POSE).ratio;
const FACE = VAL_FACES[VAL_POSE];
const HEAD_TOP = 0.08; // haut du chapeau, en fraction de l'image de Val
const BUBBLE_GAP = 10;
// Bulle sur le côté de la tête : écart avec la tête, largeur minimale (sinon
// elle passe au-dessus, décalée pour laisser voir l'arche)
const SIDE_GAP = 14;
const SIDE_MIN_WIDTH = 136;
const BUBBLE_HEIGHT_GUESS = bubble.lineHeight + bubble.paddingY * 2;
const LOGO_HEIGHT = 28;
// Dégradés : sombre en haut (logo lisible), fondu vers le fond en bas
const TOP_SHADE = 120;
// Profondeur : décalage maximal du décor selon l'inclinaison (Val : moitié)
const PARALLAX = 6;
const GRAVITY = 9.81;

// Entrée (1,2 s au plus) : la lumière monte, Val saute, la bulle apparaît
const LIGHT_RISE = 400;
const LIGHT_LOW = 0.75; // la lumière pulse entre 0,75 et 1
const VAL_DELAY = 250;
const VAL_JUMP = 40;
const BUBBLE_DELAY = 520;
const LIFE_START = 1200;
// Poussières dans le rayon de lumière
const DUST_COUNT = 8;

// Pseudo-aléatoire stable (mêmes rythmes à chaque ouverture)
function seeded(i: number, salt: number): number {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

type VaultSceneProps = {
  width: number;
  // Hauteur de la scène : l'image est calée en bas (le plafond se rogne sur
  // petit écran, la porte et la flaque restent visibles)
  height: number;
  // Haut de la zone de sécurité : le logo se pose dessous
  topInset: number;
  // Fond commun de l'écran (onglet) : le bas du décor s'y fond
  tab: string;
  line: string;
};

// Scène de la bienvenue : le décor du coffre-fort entrouvert, sa lumière qui
// pulse et ses poussières, le logo, Val qui soulève son chapeau, debout dans
// la flaque de lumière avec un contre-jour doré, sa bulle à côté de la tête. Décor décoratif pour le lecteur d'écran : on
// lit le logo, puis « Val : … ».
export default function VaultScene({ width, height, topInset, tab, line }: VaultSceneProps) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const reduced = useReducedMotion();
  // Profondeur seulement sur le téléphone, et jamais avec les animations réduites
  const parallax = Platform.OS !== 'web' && !reduced;

  // Décor un peu plus large que l'écran et calé un peu sous la scène : en
  // glissant (profondeur), il ne laisse jamais voir de bord. Scène plus haute
  // que l'image (grand écran) : l'image s'agrandit pour la couvrir, rognée
  // également des deux côtés (porte et flaque restent au centre)
  const imageWidth = Math.max(width + PARALLAX * 2, (height + PARALLAX * 2) * IMAGE_RATIO);
  const imageHeight = imageWidth / IMAGE_RATIO;
  const imageLeft = (width - imageWidth) / 2;
  // Image calée en bas : sa position verticale dans la scène
  const imageTop = height - imageHeight + PARALLAX;
  const scale = Math.min(1.1, Math.max(0.55, height / REFERENCE_HEIGHT));
  const valH = Math.round(VAL_HEIGHT * scale);
  const valW = Math.round(valH * VAL_RATIO);
  const feetY = imageTop + imageHeight * FEET_Y;
  const valTop = feetY - valH * 0.97;
  const valLeft = (width - valW) / 2;

  // Bas du décor : fondu continu de la flaque jusqu'au bas de la scène
  const fadeTop = imageTop + imageHeight * FADE_FROM;

  // Bulle sur le côté de la tête, à hauteur de bouche, pointe vers elle (elle
  // ne cache pas l'arche) ; trop peu de place à droite : au-dessus de la
  // tête, décalée vers la droite pour laisser voir le sommet de l'arche
  const [bubbleSize, setBubbleSize] = useState({ width: 0, height: BUBBLE_HEIGHT_GUESS });
  const mouth = { x: valLeft + valW * FACE.mouthX, y: valTop + valH * FACE.mouthY };
  const margin = space[4];
  const headRight = valLeft + valW * FACE.headRight;
  const sideLeft = headRight + SIDE_GAP;
  const side = width - margin - sideLeft >= SIDE_MIN_WIDTH;
  const edge = bubble.radius + bubble.tailBase / 2;
  let bubbleLeft: number;
  let bubbleTop: number;
  let anchor: number;
  let aim: { x: number; y: number };
  let tail: number;
  if (side) {
    bubbleLeft = sideLeft;
    // Pointe à mi-hauteur d'une ligne, au niveau de la bouche
    anchor = Math.min(Math.max(edge, bubbleSize.height / 2), BUBBLE_HEIGHT_GUESS / 2);
    bubbleTop = mouth.y - anchor;
    aim = { x: mouth.x - bubbleLeft, y: 0 };
    tail = tailLength(SIDE_GAP);
  } else {
    // Pointe près du bord gauche : la bulle s'étend vers la droite, le
    // sommet de l'arche (à gauche de la bouche) reste visible
    bubbleLeft = bubbleSize.width
      ? Math.min(width - margin - bubbleSize.width, Math.max(margin, mouth.x - edge))
      : margin;
    bubbleTop = valTop - BUBBLE_GAP - bubbleSize.height;
    anchor = bubbleSize.width ? Math.min(bubbleSize.width - edge, Math.max(edge, mouth.x - bubbleLeft)) : edge;
    aim = { x: mouth.x - (bubbleLeft + anchor), y: mouth.y - (bubbleTop + bubbleSize.height) };
    tail = tailLength(BUBBLE_GAP + valH * HEAD_TOP);
  }

  // La porte s'éclaire, puis la lumière pulse lentement
  const light = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (reduced) return;
    const half = { duration: loops.haloPulse / 2, easing: Easing.inOut(Easing.sin) };
    light.set(
      withSequence(
        withTiming(1, { duration: LIGHT_RISE, easing: Easing.out(Easing.quad) }),
        withDelay(LIFE_START - LIGHT_RISE, withRepeat(withSequence(withTiming(LIGHT_LOW, half), withTiming(1, half)), -1))
      )
    );
  }, [reduced, light]);
  const lightStyle = useAnimatedStyle(() => ({ opacity: light.get() }));

  // Val saute dans la lumière
  const jump = useSharedValue(reduced ? 0 : VAL_JUMP);
  const valOpacity = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (reduced) return;
    jump.set(withDelay(VAL_DELAY, withSpring(0, springs.celebrate)));
    valOpacity.set(withDelay(VAL_DELAY, withTiming(1, { duration: 160 })));
  }, [reduced, jump, valOpacity]);
  const valStyle = useAnimatedStyle(() => ({ opacity: valOpacity.get(), transform: [{ translateY: jump.get() }] }));


  const decor = (
    <View style={[styles.abs, { left: imageLeft, top: imageTop, width: imageWidth, height: imageHeight }]}>
      <Image source={VAULT_IMAGE} style={{ width: imageWidth, height: imageHeight }} resizeMode="cover" />
      {/* Lumière du coffre : porte et flaque, qui pulsent */}
      <Animated.View style={[StyleSheet.absoluteFill, lightStyle]}>
        <Sheen
          spots={[
            { ...DOOR_LIGHT, color: colors.gold, opacity: 0.32 },
            { ...POOL_LIGHT, color: colors.gold, opacity: 0.26 },
          ]}
        />
      </Animated.View>
      {reduced ? null : <Dust width={imageWidth} height={imageHeight} color={colors.gold} />}
    </View>
  );

  const figure = (
    <Animated.View style={[styles.abs, { left: 0, top: 0, width, height }, valStyle]}>
      {/* Ombre au sol, bien marquée dans la flaque claire */}
      <GroundShadow
        width={valW * 1.15}
        height={18 * scale}
        opacity={0.75}
        left={width / 2 - (valW * 1.15) / 2}
        top={feetY - 10 * scale}
      />
      {/* Contre-jour : la lumière du coffre épouse sa silhouette */}
      <View style={[styles.abs, { left: valLeft, top: valTop }]}>
        <ValFullBody pose={VAL_POSE} width={valW} height={0} breathe rimLight />
      </View>
    </Animated.View>
  );

  return (
    <View style={[styles.scene, { width, height }]}>
      <View style={StyleSheet.absoluteFill} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none">
        {parallax ? <ParallaxLayer depth={PARALLAX}>{decor}</ParallaxLayer> : decor}
        {/* Haut assombri (logo lisible), bas fondu dans le fond de l'app */}
        <LinearGradient
          colors={[withOpacity(colors.background, 0.85), withOpacity(colors.background, 0)]}
          style={[styles.abs, { left: 0, right: 0, top: 0, height: TOP_SHADE }]}
        />
        <BackdropFade tab={tab} top={fadeTop} height={height - fadeTop} direction="in" />
        {parallax ? <ParallaxLayer depth={PARALLAX / 2}>{figure}</ParallaxLayer> : figure}
      </View>

      <Image
        source={LOGO}
        resizeMode="contain"
        style={[styles.logo, { top: topInset + space[3], left: (width - LOGO_HEIGHT * LOGO_RATIO) / 2 }]}
        accessible
        accessibilityRole="image"
        accessibilityLabel="Valtheria"
      />

      <View style={[styles.abs, { left: bubbleLeft, top: bubbleTop, opacity: bubbleSize.width ? 1 : 0 }]}>
        <SpeechBubble
          text={line}
          side={side ? 'left' : 'bottom'}
          anchor={anchor}
          aim={aim}
          tailLength={tail}
          delay={BUBBLE_DELAY}
          maxWidth={side ? width - margin - sideLeft : width - margin * 2}
          onLayout={(w, h) => {
            if (w !== bubbleSize.width || h !== bubbleSize.height) setBubbleSize({ width: w, height: h });
          }}
        />
      </View>
    </View>
  );
}

// Calque qui glisse très légèrement à l'inverse de l'inclinaison du téléphone
// (capteur de gravité de Reanimated). Capteur absent : immobile.
function ParallaxLayer({ depth, children }: { depth: number; children: ReactNode }) {
  const sensor = useAnimatedSensor(SensorType.GRAVITY, { interval: 'auto' });
  const style = useAnimatedStyle(() => {
    if (!sensor.isAvailable) return {};
    const { x, y } = sensor.sensor.value;
    const tiltX = Math.max(-1, Math.min(1, x / GRAVITY));
    const tiltY = Math.max(-1, Math.min(1, (y + GRAVITY * 0.6) / GRAVITY));
    return { transform: [{ translateX: -tiltX * depth }, { translateY: tiltY * depth * 0.6 }] };
  });
  return <Animated.View style={[StyleSheet.absoluteFill, style]}>{children}</Animated.View>;
}

// Poussières dorées qui montent lentement dans le rayon de lumière, en boucle
function Dust({ width, height, color }: { width: number; height: number; color: string }) {
  const motes = useMemo(
    () =>
      Array.from({ length: DUST_COUNT }, (_, i) => ({
        x: width * (0.3 + seeded(i, 1) * 0.32),
        y: height * (0.62 + seeded(i, 2) * 0.28),
        rise: height * (0.12 + seeded(i, 3) * 0.12),
        size: 2 + Math.round(seeded(i, 4) * 1.5),
        duration: 5200 + Math.round(seeded(i, 5) * 3600),
        delay: Math.round(seeded(i, 6) * 3000),
      })),
    [width, height]
  );
  return (
    <>
      {motes.map((m, i) => (
        <Mote key={i} {...m} color={color} />
      ))}
    </>
  );
}

function Mote({
  x,
  y,
  rise,
  size,
  duration,
  delay,
  color,
}: {
  x: number;
  y: number;
  rise: number;
  size: number;
  duration: number;
  delay: number;
  color: string;
}) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(
      withDelay(
        LIFE_START + delay,
        withRepeat(withSequence(withTiming(1, { duration, easing: Easing.linear }), withTiming(0, { duration: 0 })), -1)
      )
    );
  }, [t, duration, delay]);
  const style = useAnimatedStyle(() => {
    const p = t.get();
    return {
      opacity: interpolate(p, [0, 0.2, 0.75, 1], [0, 0.7, 0.5, 0]),
      transform: [{ translateY: -rise * p }, { translateX: Math.sin(p * Math.PI * 2) * 3 }],
    };
  });
  return (
    <Animated.View
      style={[styles.abs, { left: x, top: y, width: size, height: size, borderRadius: size / 2, backgroundColor: color }, style]}
    />
  );
}

const styles = StyleSheet.create({
  scene: {
    overflow: 'hidden',
  },
  abs: {
    position: 'absolute',
  },
  logo: {
    position: 'absolute',
    height: LOGO_HEIGHT,
    width: LOGO_HEIGHT * LOGO_RATIO,
  },
});
