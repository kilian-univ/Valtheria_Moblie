import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import AppText from '@/src/components/common/AppText';
import { fonts, palette, space } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { DictionaryEntry, highlightRange } from '@/src/utils/dictionary';

// Hauteurs FIXES : la liste A-Z (centaines de mots) saute à une lettre par
// calcul, sans mesurer les lignes. Le texte est plafonné à ROW_MAX_SCALE pour
// tenir dans la hauteur calculée.
export const ROW_MAX_SCALE = 1.3;
const PADDING_V = 12;
const TERM_LINE = 22;
const DEF_LINE = 20;
const GAP = 2;
const CHEVRON = 18;

export function termRowHeight(fontScale: number): number {
  const m = Math.min(Math.max(fontScale, 1), ROW_MAX_SCALE);
  return Math.ceil(2 * PADDING_V + (TERM_LINE + DEF_LINE) * m + GAP);
}

export const LETTER_HEADER_HEIGHT = 36;

type TermRowProps = {
  entry: DictionaryEntry;
  height?: number;
  // Partie tapée surlignée en or dans le mot
  query?: string;
  last?: boolean;
  // Place laissée à droite (index alphabétique)
  paddingRight?: number;
  onPress: () => void;
};

// Ligne d'un mot : terme et catégorie, définition sur une ligne, chevron
export default function TermRow({ entry, height, query = '', last = false, paddingRight = space[5], onPress }: TermRowProps) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const range = query ? highlightRange(entry.term, query) : null;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${entry.term}, ${entry.category}. ${entry.definition}`}
      style={({ pressed }) => [
        styles.row,
        { height, paddingRight },
        !last && { borderBottomWidth: 1, borderBottomColor: colors.border },
        pressed && { backgroundColor: colors.surface2 },
      ]}
    >
      <View style={styles.texts}>
        <View style={styles.titleLine}>
          <Text
            numberOfLines={1}
            maxFontSizeMultiplier={ROW_MAX_SCALE}
            style={[styles.term, { color: colors.text }]}
          >
            {range ? (
              <>
                {entry.term.slice(0, range.start)}
                <Text style={{ color: colors.gold }}>{entry.term.slice(range.start, range.end)}</Text>
                {entry.term.slice(range.end)}
              </>
            ) : (
              entry.term
            )}
          </Text>
          <AppText variant="caption" tone="subtitle" numberOfLines={1} maxFontSizeMultiplier={ROW_MAX_SCALE} style={styles.category}>
            {entry.category}
          </AppText>
        </View>
        <AppText variant="callout" tone="subtitle" numberOfLines={1} maxFontSizeMultiplier={ROW_MAX_SCALE}>
          {entry.definition}
        </AppText>
      </View>
      <Ionicons name="chevron-forward" size={CHEVRON} color={colors.subtitle} />
    </Pressable>
  );
}

// Intitulé de lettre dans la liste : transparent (le fond commun se voit).
// Arrivé en haut, c'est la copie collée de l'écran qui prend le relais
// (StuckLetterHeader, accueil du Dictionnaire).
export function LetterHeader({ letter }: { letter: string }) {
  return (
    <View style={styles.header}>
      <AppText variant="sectionLabel" accessibilityRole="header">
        {letter}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    paddingVertical: PADDING_V,
    paddingLeft: space[5],
  },
  texts: {
    flex: 1,
    gap: GAP,
  },
  titleLine: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: space[2],
  },
  term: {
    fontFamily: fonts.bodySemibold,
    fontSize: 16,
    lineHeight: TERM_LINE,
    flexShrink: 1,
  },
  category: {
    flexShrink: 0,
    maxWidth: '45%',
  },
  header: {
    height: LETTER_HEADER_HEIGHT,
    justifyContent: 'flex-end',
    paddingBottom: space[2],
    paddingHorizontal: space[5],
  },
});
