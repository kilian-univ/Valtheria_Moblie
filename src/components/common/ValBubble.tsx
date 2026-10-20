import { ReactNode, useEffect, useId, useMemo, useState } from 'react';
import { ImageSourcePropType, ImageStyle, Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { frenchSpaces } from '@/src/utils/frenchSpaces';
import Text from '@/src/components/common/Text';
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
import Svg, {
  Defs,
  G,
  Image as SvgImage,
  LinearGradient as SvgLinearGradient,
  Mask,
  Polygon,
  Rect,
  Stop,
} from 'react-native-svg';

import { loops, springs } from '@/src/constants/motion';
import { bubble, bubbleShadow, fonts, palette, size, space, titleLetterSpacing } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import {
  besideLayout,
  noOrphan,
  type Point,
  tailDirection,
  tailPoints,
  type TailSide,
  type ValFace,
} from '@/src/utils/speechBubble';

export type ValMood =
  | 'neutre'
  | 'complice'
  | 'preoccupe'
  | 'determine'
  | 'alerte'
  | 'fier'
  | 'celebrant'
  | 'rassurant';

// Les dossiers du site sont des RECADRAGES du même dessin, pas des
// résolutions : md (276 px) cadre la tête et le haut du gilet, xl (690 px)
// montre le buste avec plus d'air. Règle : la source fait au moins 3 fois la
// taille affichée.
// - md : cercles jusqu'à 92 px (les cercles de 64 et 90 px) ;
// - xl : Val en grand (accueil, fin de leçon), jusqu'à 230 px.
export type ValFrame = 'md' | 'xl';

const VAL_IMAGES: Record<ValFrame, Record<ValMood, ImageSourcePropType>> = {
  md: {
    neutre: require('@/assets/images/val/md/val-neutre.webp'),
    complice: require('@/assets/images/val/md/val-complice.webp'),
    preoccupe: require('@/assets/images/val/md/val-preoccupe.webp'),
    determine: require('@/assets/images/val/md/val-determine.webp'),
    alerte: require('@/assets/images/val/md/val-alerte.webp'),
    fier: require('@/assets/images/val/md/val-fier.webp'),
    celebrant: require('@/assets/images/val/md/val-celebrant.webp'),
    rassurant: require('@/assets/images/val/md/val-rassurant.webp'),
  },
  xl: {
    neutre: require('@/assets/images/val/xl/val-neutre.webp'),
    complice: require('@/assets/images/val/xl/val-complice.webp'),
    preoccupe: require('@/assets/images/val/xl/val-preoccupe.webp'),
    determine: require('@/assets/images/val/xl/val-determine.webp'),
    alerte: require('@/assets/images/val/xl/val-alerte.webp'),
    fier: require('@/assets/images/val/xl/val-fier.webp'),
    celebrant: require('@/assets/images/val/xl/val-celebrant.webp'),
    rassurant: require('@/assets/images/val/xl/val-rassurant.webp'),
  },
};

// Seules ces humeurs ont un dessin yeux fermés (comme BLINK_MOODS du site)
const VAL_CLOSED: Record<ValFrame, Partial<Record<ValMood, ImageSourcePropType>>> = {
  md: {
    neutre: require('@/assets/images/val/md/val-neutre-yeux-fermes.webp'),
    rassurant: require('@/assets/images/val/md/val-rassurant-yeux-fermes.webp'),
  },
  xl: {
    neutre: require('@/assets/images/val/xl/val-neutre-yeux-fermes.webp'),
    rassurant: require('@/assets/images/val/xl/val-rassurant-yeux-fermes.webp'),
  },
};

// Clignement : toutes les 3 à 7 s, jamais régulier, parfois double (comme le site)
const BLINK_CLOSED_MS = 160;
const BLINK_GAP_MS = 120;
const BLINK_MIN_DELAY = 3000;
const BLINK_RANDOM_DELAY = 4000;
const BLINK_DOUBLE_CHANCE = 0.28;

export function useBlink(enabled: boolean): boolean {
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const later = (ms: number, run: () => void) => timers.push(setTimeout(run, ms));
    const blinkOnce = (then: () => void) => {
      setClosed(true);
      later(BLINK_CLOSED_MS, () => {
        setClosed(false);
        then();
      });
    };
    const schedule = () => {
      const delay = BLINK_MIN_DELAY + Math.floor(Math.random() * BLINK_RANDOM_DELAY);
      const double = Math.random() < BLINK_DOUBLE_CHANCE;
      later(delay, () =>
        blinkOnce(() => (double ? later(BLINK_GAP_MS, () => blinkOnce(schedule)) : schedule()))
      );
    };
    schedule();
    return () => timers.forEach(clearTimeout);
  }, [enabled]);

  return enabled && closed;
}

// Sources d'une humeur dans un cadrage : yeux ouverts, et yeux fermés si
// l'humeur en a (humeur inconnue → neutre)
export function valSources(mood: ValMood, frame: ValFrame): { open: ImageSourcePropType; closed?: ImageSourcePropType } {
  const safeMood: ValMood = VAL_IMAGES[frame][mood] ? mood : 'neutre';
  return { open: VAL_IMAGES[frame][safeMood], closed: VAL_CLOSED[frame][safeMood] };
}

// Fondu du bas des bustes : opaque jusqu'à 60 % de la hauteur, transparent
// en bas (l'image ne s'arrête jamais sur un bord net)
const FADE_FROM = 0.6;
const MASK_WHITE = '#FFFFFF';

// Image de Val, qui cligne des yeux quand son humeur le permet (pas avec les
// animations réduites), le bas fondu dans le fond. Dessinée en SVG sous un
// masque en dégradé (même rendu sur le web et le téléphone). L'image yeux
// fermés est posée par-dessus, toujours chargée : aucun trou pendant le
// clignement. style : taille (largeur et hauteur en nombres) et position.
export function ValPicture({
  mood,
  frame,
  style,
}: {
  mood: ValMood;
  frame: ValFrame;
  style: StyleProp<ImageStyle>;
}) {
  const reduced = useReducedMotion();
  const id = `vb${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const safeMood: ValMood = VAL_IMAGES[frame][mood] ? mood : 'neutre';
  const closedSource = VAL_CLOSED[frame][safeMood];
  const closed = useBlink(!!closedSource && !reduced);
  const flat = StyleSheet.flatten(style) ?? {};
  const width = typeof flat.width === 'number' ? flat.width : size.valSm;
  const height = typeof flat.height === 'number' ? flat.height : width;

  return (
    <View style={style as StyleProp<ViewStyle>} pointerEvents="none">
      <Svg width={width} height={height}>
        <Defs>
          <SvgLinearGradient id={`${id}g`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset={0} stopColor={MASK_WHITE} stopOpacity={1} />
            <Stop offset={FADE_FROM} stopColor={MASK_WHITE} stopOpacity={1} />
            <Stop offset={1} stopColor={MASK_WHITE} stopOpacity={0} />
          </SvgLinearGradient>
          <Mask id={`${id}m`}>
            <Rect x={0} y={0} width={width} height={height} fill={`url(#${id}g)`} />
          </Mask>
        </Defs>
        <G mask={`url(#${id}m)`}>
          <SvgImage
            href={VAL_IMAGES[frame][safeMood]}
            x={0}
            y={0}
            width={width}
            height={height}
            preserveAspectRatio="xMidYMid slice"
          />
          {closedSource ? (
            <SvgImage
              href={closedSource}
              x={0}
              y={0}
              width={width}
              height={height}
              preserveAspectRatio="xMidYMid slice"
              opacity={closed ? 1 : 0}
            />
          ) : null}
        </G>
      </Svg>
    </View>
  );
}

const APPEAR_DELAY = 150;
const APPEAR_FADE = 220;
// La bulle grandit depuis sa pointe
const APPEAR_SCALE_FROM = 0.85;
const WORD_INTERVAL = 45;
const TYPING_MAX = 1200;
// Flottement très doux une fois le texte écrit
const FLOAT_HEIGHT = 2;
// Hauteur de la pointe dans la bulle, par défaut : milieu d'une ligne
const DEFAULT_ANCHOR = 24;
// Écart entre la tête de Val et sa bulle, par défaut
const BESIDE_GAP = space[3];
// Portrait rond (cadrages md et xl) : bouche et bord droit de la tête
export const AVATAR_FACE: ValFace = { mouthX: 0.58, mouthY: 0.66, headRight: 0.8 };

type Word = { text: string; bold: boolean };

// "Tu as **gagné** 20 XP" → mots avec leur espace de fin, emphase comprise
function parseWords(source: string): Word[] {
  const words: Word[] = [];
  for (const run of source.split(/(\*\*[^*]+\*\*)/)) {
    if (!run) continue;
    const bold = run.startsWith('**') && run.endsWith('**') && run.length > 4;
    const content = bold ? run.slice(2, -2) : run;
    for (const piece of content.match(/\S+\s*|\s+/g) ?? []) {
      words.push({ text: piece, bold });
    }
  }
  return words;
}

// Lu par le lecteur d'écran : « Val : <titre>. <texte> »
export function valAccessibilityLabel(text: string, title?: string): string {
  const plainText = text.replace(/\*\*([^*]+)\*\*/g, '$1');
  return `Val : ${title ? `${title}. ` : ''}${plainText}`;
}

// Portrait de Val dans un cercle (décoratif : jamais lu)
export function ValAvatar({ mood, diameter = size.valSm }: { mood: ValMood; diameter?: number }) {
  return (
    <View
      style={{ width: diameter, height: diameter, borderRadius: diameter / 2, overflow: 'hidden' }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <ValPicture mood={mood} frame="md" style={[styles.fill, { width: diameter, height: diameter }]} />
    </View>
  );
}

type ValBubbleProps = {
  mood: ValMood;
  text: string;
  title?: string;
  diameter?: number;
};

// Val en portrait rond, sa bulle à droite, collée à hauteur de bouche
export default function ValBubble({ mood, text, title, diameter = size.valSm }: ValBubbleProps) {
  return (
    <ValBeside
      figure={<ValAvatar mood={mood} diameter={diameter} />}
      width={diameter}
      height={diameter}
      face={AVATAR_FACE}
      text={text}
      title={title}
    />
  );
}

type ValBesideProps = {
  // Dessin de Val (portrait, buste, en pied), décoratif
  figure: ReactNode;
  // Taille de l'image de Val (la bouche s'y repère par `face`)
  width: number;
  height: number;
  face: ValFace;
  text: string;
  title?: string;
  gap?: number;
  delay?: number;
  maxWidth?: number;
  // false : le texte s'affiche d'un coup (réplique qui change souvent)
  typing?: boolean;
  // Petit texte doré après la réplique (« 1 sur 2 »)
  accent?: string;
};

// Val, puis sa bulle à droite : la pointe à hauteur de bouche, dirigée vers
// elle, longue de 55 % de l'écart jusqu'à la tête
export function ValBeside({ figure, width, height, face, text, title, gap = BESIDE_GAP, delay, maxWidth, typing, accent }: ValBesideProps) {
  const layout = besideLayout(face, width, height, gap, DEFAULT_ANCHOR);
  return (
    <View style={[styles.row, { gap }]}>
      <View style={{ width, height }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {figure}
      </View>
      {/* key : un nouveau texte remonte la bulle et relance l'écriture */}
      <SpeechBubble
        key={`${title ?? ''}|${text}|${accent ?? ''}`}
        text={text}
        title={title}
        accent={accent}
        side="left"
        anchor={layout.anchor}
        aim={layout.aim}
        tailLength={layout.length}
        delay={delay}
        maxWidth={maxWidth}
        typing={typing}
        style={[styles.besideBubble, { marginTop: layout.offsetTop }]}
      />
    </View>
  );
}

type SpeechBubbleProps = {
  text: string;
  title?: string;
  // Côté de la pointe : à gauche, à droite ou en bas de la bulle
  side?: TailSide;
  // Position de la pointe le long de ce côté (depuis le haut pour gauche et
  // droite, depuis la gauche pour le bas)
  anchor?: number;
  // Vers la bouche de Val, depuis la base de la pointe (px)
  aim?: Point;
  // Longueur de la pointe : environ 55 % de l'écart jusqu'à la tête
  tailLength?: number;
  // Attente avant l'apparition (ms)
  delay?: number;
  maxWidth?: number;
  // Placement de la bulle (marges, position)
  style?: StyleProp<ViewStyle>;
  // false : le texte s'affiche d'un coup, sans s'écrire mot à mot
  typing?: boolean;
  // false : le parent porte le libellé lu
  accessible?: boolean;
  // Petit texte doré en gras après la réplique (« 1 sur 2 »), écrit avec le
  // dernier mot
  accent?: string;
  onLayout?: (width: number, height: number) => void;
};

// LA bulle de Val, partout où il parle : ivoire, texte sombre, vraie pointe
// dirigée vers sa bouche, ombre douce. Elle grandit depuis sa pointe, le
// texte s'écrit mot à mot (un toucher affiche tout), puis elle flotte très
// doucement. Animations réduites : affichée directement, immobile. Pas de
// mot seul sur la dernière ligne. Lue « Val : <texte> ».
export function SpeechBubble({
  text,
  title,
  side = 'left',
  anchor,
  aim,
  tailLength = 12,
  delay = APPEAR_DELAY,
  maxWidth = bubble.maxWidth,
  style,
  accessible = true,
  onLayout,
  typing = true,
  accent,
}: SpeechBubbleProps) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const reduced = useReducedMotion();

  // Espaces insécables posées sur la phrase entière, avant le découpage en mots
  const words = useMemo(() => parseWords(noOrphan(frenchSpaces(text))), [text]);
  const [shown, setShown] = useState(reduced || !typing ? words.length : 0);
  const at = anchor ?? (side === 'bottom' ? bubble.radius + bubble.tailBase : DEFAULT_ANCHOR);

  const opacity = useSharedValue(reduced ? 1 : 0);
  const scale = useSharedValue(reduced ? 1 : APPEAR_SCALE_FROM);
  const float = useSharedValue(0);

  useEffect(() => {
    if (reduced) return;
    opacity.set(withDelay(delay, withTiming(1, { duration: APPEAR_FADE })));
    scale.set(withDelay(delay, withSpring(1, springs.enter)));

    const step = typing ? Math.min(WORD_INTERVAL, TYPING_MAX / Math.max(words.length, 1)) : 0;
    // Flottement une fois le texte écrit
    const half = { duration: loops.bubbleFloat / 2, easing: Easing.inOut(Easing.sin) };
    float.set(
      withDelay(
        delay + APPEAR_FADE + step * words.length,
        withRepeat(withSequence(withTiming(-FLOAT_HEIGHT, half), withTiming(0, half)), -1)
      )
    );

    if (!typing) return;
    let interval: ReturnType<typeof setInterval> | undefined;
    let written = 0;
    const start = setTimeout(() => {
      interval = setInterval(() => {
        written += 1;
        // max : un toucher a pu tout afficher entre-temps, on ne recule pas
        setShown((n) => Math.max(n, written));
        if (written >= words.length) clearInterval(interval);
      }, step);
    }, delay);

    return () => {
      clearTimeout(start);
      if (interval) clearInterval(interval);
    };
  }, [opacity, scale, float, reduced, words.length, delay, typing]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.get(),
    transform: [{ translateY: float.get() }, { scale: scale.get() }],
  }));

  // La bulle grandit depuis sa pointe
  const origin: (string | number)[] = side === 'left' ? [0, at, 0] : side === 'right' ? ['100%', at, 0] : [at, '100%', 0];

  return (
    <Animated.View
      style={[styles.bubbleWrap, { transformOrigin: origin }, style, animatedStyle]}
      accessible={accessible}
      accessibilityLabel={accessible ? valAccessibilityLabel(accent ? `${text} ${accent}` : text, title) : undefined}
      onLayout={onLayout ? (e) => onLayout(e.nativeEvent.layout.width, e.nativeEvent.layout.height) : undefined}
    >
      <Pressable
        onPress={() => setShown(words.length)}
        disabled={shown >= words.length}
        style={[
          styles.bubble,
          { maxWidth, backgroundColor: colors.bubble, boxShadow: bubbleShadow(colors.groundShadow) },
        ]}
      >
        {title ? (
          <Text maxFontSizeMultiplier={1.3} style={[styles.title, { color: colors.onBubble }]}>
            {title}
          </Text>
        ) : null}
        {/* Tout le texte est posé dès le départ (taille de bulle stable) ;
            les mots pas encore écrits sont simplement invisibles. */}
        <Text maxFontSizeMultiplier={2} style={[styles.text, { color: colors.onBubble }]}>
          {words.map((word, i) => (
            <Text key={i} style={[word.bold && styles.emphasis, i >= shown && styles.hidden]}>
              {word.text}
            </Text>
          ))}
          {accent ? (
            <Text style={[styles.accent, { color: colors.bubbleAccent }, shown < words.length && styles.hidden]}>
              {` ${accent}`}
            </Text>
          ) : null}
        </Text>
        <Tail side={side} anchor={at} aim={aim} length={tailLength} color={colors.bubble} />
      </Pressable>
    </Animated.View>
  );
}

// Pointe triangulaire, dans la matière de la bulle, posée sur son bord
function Tail({ side, anchor, aim, length, color }: { side: TailSide; anchor: number; aim?: Point; length: number; color: string }) {
  const box = Math.ceil(length + bubble.tailBase);
  const points = tailPoints(side, tailDirection(side, aim), length, bubble.tailBase)
    .map((p) => `${p.x + box},${p.y + box}`)
    .join(' ');
  const place =
    side === 'left'
      ? { left: -box, top: anchor - box }
      : side === 'right'
        ? { right: -box, top: anchor - box }
        : { bottom: -box, left: anchor - box };
  return (
    <Svg
      width={box * 2}
      height={box * 2}
      style={[styles.tail, place]}
      pointerEvents="none"
    >
      <Polygon points={points} fill={color} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  besideBubble: {
    flexShrink: 1,
  },
  // Largeur adaptée au texte, jamais au-delà de maxWidth
  bubbleWrap: {
    alignSelf: 'flex-start',
  },
  bubble: {
    borderRadius: bubble.radius,
    borderCurve: 'continuous',
    paddingVertical: bubble.paddingY,
    paddingHorizontal: bubble.paddingX,
    gap: space[1],
  },
  title: {
    fontFamily: fonts.title,
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: titleLetterSpacing(18),
  },
  text: {
    fontFamily: fonts.bodyMedium,
    fontSize: bubble.fontSize,
    lineHeight: bubble.lineHeight,
  },
  emphasis: {
    fontFamily: fonts.bodyEmphasis,
  },
  accent: {
    fontFamily: fonts.bodyBold,
  },
  tail: {
    position: 'absolute',
  },
  fill: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  // Mot pas encore écrit : garde sa place sans être visible
  hidden: {
    color: 'transparent',
  },
});
