import { router } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import AppText from '@/src/components/common/AppText';
import { fonts, palette } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { useDictionary } from '@/src/hooks/useDictionary';
import { findEntry } from '@/src/utils/dictionary';
import { termHref } from '@/src/utils/dictionaryLinks';
import { tap } from '@/src/utils/haptics';

// Petit « ? » à côté d'un terme technique : ouvre sa fiche du Dictionnaire.
// Rien si le mot n'y est pas (ou si le Dictionnaire n'est pas chargé).
export default function HelpTerm({ term, alt = [] }: { term: string; alt?: string[] }) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const { entries } = useDictionary();
  const entry = [term, ...alt].map((t) => findEntry(entries, t)).find(Boolean) ?? null;
  if (!entry) return null;
  return (
    <Pressable
      onPress={() => {
        tap();
        router.push(termHref(entry.term, entry.category));
      }}
      hitSlop={14}
      accessibilityRole="button"
      accessibilityLabel={`Définition : ${entry.term}`}
      accessibilityHint="Ouvre sa fiche du Dictionnaire"
      style={({ pressed }) => [styles.dot, { borderColor: colors.subtitle, opacity: pressed ? 0.6 : 1 }]}
    >
      <AppText maxFontSizeMultiplier={1} style={[styles.mark, { color: colors.subtitle }]}>
        ?
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mark: { fontFamily: fonts.bodyBold, fontSize: 10, lineHeight: 12 },
});
