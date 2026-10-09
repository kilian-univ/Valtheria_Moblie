import { useEffect, useMemo, useState } from 'react';
import {
  Image,
  ImageSourcePropType,
  ImageStyle,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { springs } from '@/src/constants/motion';
import { fonts, palette, radius, size, space, titleLetterSpacing } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import AppText from './AppText';

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

function useBlink(enabled: boolean): boolean {
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

// Image de Val, qui cligne des yeux quand son humeur le permet (pas avec les
// animations réduites). L'image yeux fermés est posée par-dessus, toujours
// chargée : aucun trou pendant le clignement.
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
  const safeMood: ValMood = VAL_IMAGES[frame][mood] ? mood : 'neutre';
  const closedSource = VAL_CLOSED[frame][safeMood];
  const closed = useBlink(!!closedSource && !reduced);

  return (
    <>
      <Image source={VAL_IMAGES[frame][safeMood]} resizeMode="cover" style={style} />
      {closedSource ? (
        <Image source={closedSource} resizeMode="cover" style={[style, !closed && styles.hiddenImage]} />
      ) : null}
    </>
  );
}

const BUBBLE_TOP_OFFSET = 10; // la bulle démarre sous le haut du chapeau
const BUBBLE_TIP_RADIUS = 4; // coin pointu, tourné vers Val
const APPEAR_DELAY = 150;
const APPEAR_FADE = 220;
const APPEAR_SCALE_FROM = 0.92;
const WORD_INTERVAL = 45;
const TYPING_MAX = 1200;

type Word = { text: string; bold: boolean };

// "Tu as **gagné** 20 XP" → mots avec leur espace de fin, gras compris
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

type ValBubbleProps = {
  mood: ValMood;
  text: string;
  title?: string;
  diameter?: number;
};

export function valAccessibilityLabel(text: string, title?: string): string {
  const plainText = text.replace(/\*\*([^*]+)\*\*/g, '$1');
  return `Val dit : ${title ? `${title}. ` : ''}${plainText}`;
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

export default function ValBubble({ mood, text, title, diameter }: ValBubbleProps) {
  return (
    <View style={styles.row} accessible accessibilityLabel={valAccessibilityLabel(text, title)}>
      <ValAvatar mood={mood} diameter={diameter} />
      {/* key : un nouveau texte remonte la bulle et relance l'écriture */}
      <ValSpeechBubble key={`${title ?? ''}|${text}`} text={text} title={title} style={styles.bubbleWrap} />
    </View>
  );
}

type SpeechBubbleProps = {
  text: string;
  title?: string;
  // Coin pointu tourné vers Val : en haut à gauche (Val à côté, en haut)
  // ou en bas à gauche (Val à côté, en bas)
  tail?: 'topLeft' | 'bottomLeft';
  bordered?: boolean;
  style?: StyleProp<ViewStyle>;
};

// Bulle de Val seule : apparition, écriture mot à mot, toucher = tout afficher.
// Le parent porte le libellé accessible (valAccessibilityLabel).
export function ValSpeechBubble({ text, title, tail = 'topLeft', bordered = false, style }: SpeechBubbleProps) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const reduced = useReducedMotion();

  const words = useMemo(() => parseWords(text), [text]);
  const [shown, setShown] = useState(reduced ? words.length : 0);

  const opacity = useSharedValue(0);
  const scale = useSharedValue(reduced ? 1 : APPEAR_SCALE_FROM);

  useEffect(() => {
    opacity.set(withDelay(APPEAR_DELAY, withTiming(1, { duration: APPEAR_FADE })));
    if (reduced) return;

    scale.set(withDelay(APPEAR_DELAY, withSpring(1, springs.enter)));

    const step = Math.min(WORD_INTERVAL, TYPING_MAX / Math.max(words.length, 1));
    let interval: ReturnType<typeof setInterval> | undefined;
    let written = 0;
    const start = setTimeout(() => {
      interval = setInterval(() => {
        written += 1;
        // max : un toucher a pu tout afficher entre-temps, on ne recule pas
        setShown((n) => Math.max(n, written));
        if (written >= words.length) clearInterval(interval);
      }, step);
    }, APPEAR_DELAY);

    return () => {
      clearTimeout(start);
      if (interval) clearInterval(interval);
    };
  }, [opacity, scale, reduced, words.length]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.get(),
    transform: [{ scale: scale.get() }],
  }));

  const revealAll = () => setShown(words.length);

  return (
    <Animated.View
      style={[{ transformOrigin: tail === 'topLeft' ? 'top left' : 'bottom left' }, style, animatedStyle]}
    >
      <Pressable
        onPress={revealAll}
        disabled={shown >= words.length}
        style={[
          styles.bubble,
          tail === 'topLeft' ? styles.tailTop : styles.tailBottom,
          { backgroundColor: colors.surface },
          bordered && { borderWidth: 1, borderColor: colors.goldLine },
        ]}
      >
        {title ? (
          <Text maxFontSizeMultiplier={1.3} style={[styles.title, { color: colors.text }]}>
            {title}
          </Text>
        ) : null}
        {/* Tout le texte est posé dès le départ (taille de bulle stable) ;
            les mots pas encore écrits sont simplement invisibles. */}
        <AppText variant="body">
          {words.map((word, i) => (
            <Text
              key={i}
              style={[
                word.bold && styles.bold,
                i >= shown && styles.hidden,
              ]}
            >
              {word.text}
            </Text>
          ))}
        </AppText>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space[3],
  },
  bubbleWrap: {
    flex: 1,
    marginTop: BUBBLE_TOP_OFFSET,
  },
  tailTop: {
    borderTopLeftRadius: BUBBLE_TIP_RADIUS,
  },
  tailBottom: {
    borderBottomLeftRadius: BUBBLE_TIP_RADIUS,
  },
  bubble: {
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    paddingVertical: space[3],
    paddingHorizontal: space[4],
    gap: space[1],
  },
  title: {
    fontFamily: fonts.title,
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: titleLetterSpacing(18),
  },
  bold: {
    fontFamily: fonts.bodySemibold,
  },
  fill: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  hiddenImage: {
    opacity: 0,
  },
  // Mot pas encore écrit : garde sa place sans être visible
  hidden: {
    color: 'transparent',
  },
});
