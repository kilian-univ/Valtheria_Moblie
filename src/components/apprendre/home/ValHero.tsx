import { useId } from 'react';
import { StyleSheet, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import Svg, { Defs, Image as SvgImage, LinearGradient, Mask, Rect, Stop } from 'react-native-svg';

import { AVATAR_FACE, useBlink, ValBeside, ValMood, valSources } from '@/src/components/common/ValBubble';
import { palette, space } from '@/src/constants/style/Style';

const BUST_WIDTH = 120;
const BUST_HEIGHT = 150;
// Part du bas du buste qui s'efface
const FADE_SHARE = 0.32;

// Image carrée affichée plus large que le cadre, ancrée en haut : on garde la
// tête et le haut du buste, le bas s'efface (masque). Bouche et tête dans le
// cadre du buste (le portrait y est décalé et agrandi).
function bustGeometry(width: number, height: number) {
  const imageSize = height;
  const imageLeft = (width - imageSize) / 2;
  return {
    imageSize,
    imageLeft,
    face: {
      mouthX: (imageLeft + imageSize * AVATAR_FACE.mouthX) / width,
      mouthY: (imageSize * AVATAR_FACE.mouthY) / height,
      headRight: (imageLeft + imageSize * AVATAR_FACE.headRight) / width,
    },
  };
}
// Masque : le blanc laisse voir, la transparence efface (indépendant du thème)
const MASK_ON = palette.dark.nodeHighlight;

type ValHeroProps = {
  mood: ValMood;
  text: string;
  title?: string;
  // Taille du buste (120 × 150 par défaut)
  width?: number;
  height?: number;
  // Petit texte doré après la réplique
  accent?: string;
  // Marge au-dessus (par défaut 16)
  flush?: boolean;
};

// Val en grand, en buste, avec sa bulle à droite à hauteur de bouche. Le bas du buste s'efface
// par un masque (vraie transparence) : il se fond dans n'importe quel fond,
// le fond commun dégradé compris.
export default function ValHero({ mood, text, title, width = BUST_WIDTH, height = BUST_HEIGHT, accent, flush = false }: ValHeroProps) {
  const { face } = bustGeometry(width, height);
  return (
    <View style={!flush && styles.wrap}>
      <ValBeside
        figure={
          <View style={[styles.bust, { width, height }]}>
            <FadedBust mood={mood} width={width} height={height} />
          </View>
        }
        width={width}
        height={height}
        face={face}
        gap={space[2]}
        text={text}
        title={title}
        accent={accent}
      />
    </View>
  );
}

// Buste masqué : opaque en haut, transparent sur la part FADE_SHARE du bas.
// Clignement des yeux conservé (image yeux fermés par-dessus).
function FadedBust({ mood, width, height }: { mood: ValMood; width: number; height: number }) {
  const reduced = useReducedMotion();
  const { open, closed } = valSources(mood, 'xl');
  const blinking = useBlink(!!closed && !reduced);
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const fadeStart = 1 - FADE_SHARE;
  const { imageSize, imageLeft: left } = bustGeometry(width, height);

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id={`f${id}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={MASK_ON} stopOpacity={1} />
          <Stop offset={fadeStart} stopColor={MASK_ON} stopOpacity={1} />
          <Stop offset="1" stopColor={MASK_ON} stopOpacity={0} />
        </LinearGradient>
        <Mask id={`m${id}`}>
          <Rect x="0" y="0" width={width} height={height} fill={`url(#f${id})`} />
        </Mask>
      </Defs>
      <SvgImage href={open} x={left} y={0} width={imageSize} height={imageSize} mask={`url(#m${id})`} />
      {closed ? (
        <SvgImage
          href={closed}
          x={left}
          y={0}
          width={imageSize}
          height={imageSize}
          opacity={blinking ? 1 : 0}
          mask={`url(#m${id})`}
        />
      ) : null}
    </Svg>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingTop: space[4],
  },
  bust: {
    overflow: 'hidden',
  },
});
