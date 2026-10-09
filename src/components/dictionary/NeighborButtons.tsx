import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import AppText from '@/src/components/common/AppText';
import { palette, radius, size, space } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { DictionaryEntry } from '@/src/utils/dictionary';

const ICON = 18;

type NeighborButtonsProps = {
  previous: DictionaryEntry | null;
  next: DictionaryEntry | null;
  onOpen: (entry: DictionaryEntry) => void;
};

// Mot précédent et mot suivant, côte à côte, avec le mot visé en dessous.
// Aux bornes, la place reste vide (les boutons ne changent pas de côté).
export default function NeighborButtons({ previous, next, onOpen }: NeighborButtonsProps) {
  if (!previous && !next) return null;
  return (
    <View style={styles.row}>
      {previous ? <Neighbor entry={previous} side="previous" onPress={() => onOpen(previous)} /> : <View style={styles.slot} />}
      {next ? <Neighbor entry={next} side="next" onPress={() => onOpen(next)} /> : <View style={styles.slot} />}
    </View>
  );
}

function Neighbor({ entry, side, onPress }: { entry: DictionaryEntry; side: 'previous' | 'next'; onPress: () => void }) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const isNext = side === 'next';
  const label = isNext ? 'Suivant' : 'Précédent';

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Mot ${isNext ? 'suivant' : 'précédent'} : ${entry.term}`}
      style={({ pressed }) => [
        styles.slot,
        styles.button,
        { borderColor: colors.controlBorder },
        isNext && styles.alignEnd,
        pressed && { backgroundColor: colors.surface2 },
      ]}
    >
      <View style={[styles.labelRow, isNext && styles.reverse]}>
        <Ionicons name={isNext ? 'chevron-forward' : 'chevron-back'} size={ICON} color={colors.text} />
        <AppText variant="bodyMedium">{label}</AppText>
      </View>
      <AppText variant="caption" tone="subtitle" numberOfLines={1}>
        {entry.term}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: space[3],
  },
  slot: {
    flex: 1,
  },
  // Aspect d'un bouton secondaire : filet, coins moyens, fond transparent
  button: {
    minHeight: size.buttonHeight,
    borderWidth: 1,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    paddingHorizontal: space[3],
    paddingVertical: space[2] + 2,
    justifyContent: 'center',
    gap: 2,
  },
  alignEnd: {
    alignItems: 'flex-end',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1],
  },
  reverse: {
    flexDirection: 'row-reverse',
  },
});
