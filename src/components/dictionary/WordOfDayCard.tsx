import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import AppText from '@/src/components/common/AppText';
import { fonts, palette, space, titleLetterSpacing, withOpacity } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { tap } from '@/src/utils/haptics';
import { DictionaryEntry } from '@/src/utils/dictionary';

const RADIUS = 18;
const EDGE = 6;
const TERM_SIZE = 26;
const SPARKLE = 14;
const BORDER_OPACITY = 0.28;

type WordOfDayCardProps = {
  entry: DictionaryEntry;
  onPress: () => void;
};

// Mot du jour : carte en relief (tranche plus sombre que la surface), fine
// bordure dorée ; toute la carte ouvre la fiche
export default function WordOfDayCard({ entry, onPress }: WordOfDayCardProps) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];

  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={`Mot du jour : ${entry.term}. ${entry.definition}`}
      accessibilityHint="Ouvre la fiche du mot"
      style={styles.wrap}
    >
      {({ pressed }) => (
        <>
          <View style={[styles.edge, { backgroundColor: colors.surfaceEdge }]} />
          <View
            style={[
              styles.face,
              {
                backgroundColor: colors.surface,
                borderColor: withOpacity(colors.gold, BORDER_OPACITY),
                transform: [{ translateY: pressed ? EDGE / 2 : 0 }],
              },
            ]}
          >
            <View style={styles.labelRow}>
              <Ionicons name="sparkles" size={SPARKLE} color={colors.gold} />
              <AppText variant="sectionLabel">Mot du jour</AppText>
            </View>
            <AppText maxFontSizeMultiplier={1.3} style={styles.term}>
              {entry.term}
            </AppText>
            <AppText variant="body" tone="subtitle" numberOfLines={3}>
              {entry.definition}
            </AppText>
            <View style={styles.footer}>
              <AppText variant="caption" tone="subtitle" numberOfLines={1} style={styles.category}>
                {entry.category}
              </AppText>
              <View style={styles.more}>
                <AppText variant="caption" tone="gold">
                  Voir la fiche
                </AppText>
                <Ionicons name="chevron-forward" size={SPARKLE} color={colors.gold} />
              </View>
            </View>
          </View>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingBottom: EDGE,
  },
  edge: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: EDGE,
    borderRadius: RADIUS,
    borderCurve: 'continuous',
  },
  face: {
    borderRadius: RADIUS,
    borderCurve: 'continuous',
    borderWidth: 1,
    padding: space[4],
    gap: space[2],
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1] + 2,
  },
  term: {
    fontFamily: fonts.title,
    fontSize: TERM_SIZE,
    lineHeight: 32,
    letterSpacing: titleLetterSpacing(TERM_SIZE),
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space[3],
    marginTop: space[1],
  },
  category: {
    flexShrink: 1,
  },
  more: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
});
