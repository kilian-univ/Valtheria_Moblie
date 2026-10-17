import { useRef, useState } from 'react';
import { GestureResponderEvent, StyleSheet, View } from 'react-native';
import Text from '@/src/components/common/Text';

import { fonts, palette } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { select } from '@/src/utils/haptics';
import { ALPHABET } from '@/src/utils/dictionary';

// Zone de toucher : au moins 24 de large
export const INDEX_WIDTH = 24;
const LETTER_MAX = 16;
const LETTER_SIZE = 10;

type AlphabetIndexProps = {
  // Lettres qui ont au moins un mot
  available: ReadonlySet<string>;
  onLetter: (letter: string) => void;
};

// Index alphabétique du bord droit : toucher ou glisser fait sauter la liste
// à la lettre, avec une vibration à chaque changement. Une lettre sans mot
// (en textFaint) mène à la suivante qui en a.
export default function AlphabetIndex({ available, onLetter }: AlphabetIndexProps) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const [areaH, setAreaH] = useState(0);
  const column = useRef<View>(null);
  const top = useRef(0);
  const last = useRef<string | null>(null);
  // Lettre affichée, pour le lecteur d'écran
  const [current, setCurrent] = useState<string | null>(null);

  const letterH = areaH > 0 ? Math.min(LETTER_MAX, areaH / ALPHABET.length) : LETTER_MAX;

  // Lettre visée, ou la suivante qui a des mots (sinon la précédente)
  const target = (index: number): string | null => {
    const i = Math.max(0, Math.min(ALPHABET.length - 1, index));
    const after = ALPHABET.slice(i).find((l) => available.has(l));
    return after ?? [...ALPHABET.slice(0, i)].reverse().find((l) => available.has(l)) ?? null;
  };

  const jumpTo = (letter: string | null) => {
    if (!letter || letter === last.current) return;
    last.current = letter;
    setCurrent(letter);
    select();
    onLetter(letter);
  };

  const onTouch = (e: GestureResponderEvent) => {
    jumpTo(target(Math.floor((e.nativeEvent.pageY - top.current) / letterH)));
  };

  // Lecteur d'écran : balayer vers le haut / le bas change de lettre
  const step = (delta: number) => {
    const letters = ALPHABET.filter((l) => available.has(l));
    const at = last.current ? letters.indexOf(last.current) : -1;
    const next = letters[Math.max(0, Math.min(letters.length - 1, at + delta))];
    if (next) jumpTo(next);
  };

  return (
    <View
      style={styles.area}
      onLayout={(e) => setAreaH(e.nativeEvent.layout.height)}
      pointerEvents="box-none"
    >
      <View
        ref={column}
        onLayout={() => column.current?.measureInWindow((_x, y) => (top.current = y))}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={(e) => {
          // La colonne a pu bouger (clavier, rotation) : on la remesure
          column.current?.measureInWindow((_x, y) => (top.current = y));
          last.current = null;
          onTouch(e);
        }}
        onResponderMove={onTouch}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel="Index alphabétique"
        accessibilityValue={current ? { text: current } : undefined}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => step(e.nativeEvent.actionName === 'increment' ? 1 : -1)}
        style={styles.column}
      >
        {ALPHABET.map((letter) => (
          <Text
            key={letter}
            allowFontScaling={false}
            style={[
              styles.letter,
              { height: letterH, lineHeight: letterH, color: available.has(letter) ? colors.gold : colors.textFaint },
            ]}
          >
            {letter}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  area: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: INDEX_WIDTH,
    justifyContent: 'center',
  },
  column: {
    width: INDEX_WIDTH,
  },
  letter: {
    fontFamily: fonts.bodyBold,
    fontSize: LETTER_SIZE,
    textAlign: 'center',
  },
});
