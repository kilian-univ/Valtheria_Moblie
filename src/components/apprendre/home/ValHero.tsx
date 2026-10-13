import { useId } from 'react';
import { StyleSheet, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import Svg, { Defs, Image as SvgImage, LinearGradient, Mask, Rect, Stop } from 'react-native-svg';

import { AVATAR_FACE, useBlink, ValBeside, ValMood, valSources } from '@/src/components/common/ValBubble';
import { palette, space } from '@/src/constants/style/Style';

const BUST_WIDTH = 120;
const BUST_HEIGHT = 150;
// Image carrée affichée plus large que le cadre, ancrée en haut : on garde la
// tête et le haut du buste, le bas s'efface (masque).
const IMAGE_SIZE = BUST_HEIGHT;
const IMAGE_LEFT = (BUST_WIDTH - IMAGE_SIZE) / 2;
// Bouche et tête dans le cadre du buste (le portrait y est décalé et agrandi)
const BUST_FACE = {
  mouthX: (IMAGE_LEFT + IMAGE_SIZE * AVATAR_FACE.mouthX) / BUST_WIDTH,
  mouthY: (IMAGE_SIZE * AVATAR_FACE.mouthY) / BUST_HEIGHT,
  headRight: (IMAGE_LEFT + IMAGE_SIZE * AVATAR_FACE.headRight) / BUST_WIDTH,
};
const FADE_HEIGHT = 48;
// Masque : le blanc laisse voir, la transparence efface (indépendant du thème)
const MASK_ON = palette.dark.nodeHighlight;

type ValHeroProps = {
  mood: ValMood;
  text: string;
  title?: string;
};

// Val en grand, en buste, avec sa bulle à droite à hauteur de bouche. Le bas du buste s'efface
// par un masque (vraie transparence) : il se fond dans n'importe quel fond,
// le fond commun dégradé compris.
export default function ValHero({ mood, text, title }: ValHeroProps) {
  return (
    <View style={styles.wrap}>
      <ValBeside
        figure={
          <View style={styles.bust}>
            <FadedBust mood={mood} />
          </View>
        }
        width={BUST_WIDTH}
        height={BUST_HEIGHT}
        face={BUST_FACE}
        gap={space[2]}
        text={text}
        title={title}
      />
    </View>
  );
}

// Buste masqué : opaque en haut, transparent sur les FADE_HEIGHT du bas.
// Clignement des yeux conservé (image yeux fermés par-dessus).
function FadedBust({ mood }: { mood: ValMood }) {
  const reduced = useReducedMotion();
  const { open, closed } = valSources(mood, 'xl');
  const blinking = useBlink(!!closed && !reduced);
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const fadeStart = 1 - FADE_HEIGHT / BUST_HEIGHT;
  const left = IMAGE_LEFT;

  return (
    <Svg width={BUST_WIDTH} height={BUST_HEIGHT}>
      <Defs>
        <LinearGradient id={`f${id}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={MASK_ON} stopOpacity={1} />
          <Stop offset={fadeStart} stopColor={MASK_ON} stopOpacity={1} />
          <Stop offset="1" stopColor={MASK_ON} stopOpacity={0} />
        </LinearGradient>
        <Mask id={`m${id}`}>
          <Rect x="0" y="0" width={BUST_WIDTH} height={BUST_HEIGHT} fill={`url(#f${id})`} />
        </Mask>
      </Defs>
      <SvgImage href={open} x={left} y={0} width={IMAGE_SIZE} height={IMAGE_SIZE} mask={`url(#m${id})`} />
      {closed ? (
        <SvgImage
          href={closed}
          x={left}
          y={0}
          width={IMAGE_SIZE}
          height={IMAGE_SIZE}
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
    width: BUST_WIDTH,
    height: BUST_HEIGHT,
    overflow: 'hidden',
  },
});
