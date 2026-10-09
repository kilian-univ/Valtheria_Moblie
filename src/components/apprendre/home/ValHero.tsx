import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { valAccessibilityLabel, ValMood, ValPicture, ValSpeechBubble } from '@/src/components/common/ValBubble';
import { palette, space } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';

const BUST_WIDTH = 120;
const BUST_HEIGHT = 150;
// Image carrée affichée plus large que le cadre, ancrée en haut : on garde la
// tête et le haut du buste, le bas se fond dans le fond de l'écran.
const IMAGE_SIZE = BUST_HEIGHT;
const FADE_HEIGHT = 48;

type ValHeroProps = {
  mood: ValMood;
  text: string;
  title?: string;
};

// Val en grand, en buste, avec sa bulle à droite. Pas de halo dessous : le
// fondu du bas se confond ainsi avec le fond de la page.
export default function ValHero({ mood, text, title }: ValHeroProps) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];

  return (
    <View style={styles.wrap} accessible accessibilityLabel={valAccessibilityLabel(text, title)}>
      <View style={styles.row}>
        <View style={styles.bust} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <ValPicture mood={mood} frame="xl" style={styles.image} />
          <LinearGradient
            colors={['transparent', colors.background]}
            style={styles.fade}
            pointerEvents="none"
          />
        </View>
        {/* key : un nouveau texte relance l'écriture mot à mot */}
        <ValSpeechBubble
          key={`${title ?? ''}|${text}`}
          text={text}
          title={title}
          tail="bottomLeft"
          bordered
          style={styles.bubble}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingTop: space[4],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: space[2],
  },
  bust: {
    width: BUST_WIDTH,
    height: BUST_HEIGHT,
    overflow: 'hidden',
  },
  image: {
    position: 'absolute',
    top: 0,
    left: (BUST_WIDTH - IMAGE_SIZE) / 2,
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
  },
  fade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: FADE_HEIGHT,
  },
  bubble: {
    flex: 1,
    marginBottom: space[4],
  },
});
