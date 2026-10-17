import { Pressable, StyleSheet } from 'react-native';
import Text from '@/src/components/common/Text';

import { fonts, palette, size, space } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { tap } from '@/src/utils/haptics';

const WORD_SIZE = 16;

// « Le mot du jour : <mot> › », une seule ligne centrée sous le programme du
// jour ; ouvre la fiche du mot
export default function WordOfDayLine({ term, onPress }: { term: string; onPress: () => void }) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      accessibilityRole="link"
      accessibilityLabel={`Le mot du jour : ${term}`}
      accessibilityHint="Ouvre sa fiche"
      style={({ pressed }) => [styles.touch, pressed && styles.pressed]}
    >
      <Text maxFontSizeMultiplier={1.4} style={[styles.line, { color: colors.subtitle }]} numberOfLines={1}>
        {'Le mot du jour : '}
        <Text style={[styles.word, { color: colors.text }]}>{term}</Text>
        <Text style={{ color: colors.gold }}>{' ›'}</Text>
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  touch: {
    minHeight: size.tapMin,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: space[2],
  },
  pressed: {
    opacity: 0.7,
  },
  line: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  word: {
    fontFamily: fonts.title,
    fontSize: WORD_SIZE,
  },
});
