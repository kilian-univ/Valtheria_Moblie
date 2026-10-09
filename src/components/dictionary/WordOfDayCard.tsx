import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import AppText from '@/src/components/common/AppText';
import ReliefCard from '@/src/components/common/ReliefCard';
import { fonts, palette, space, titleLetterSpacing } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { tap } from '@/src/utils/haptics';
import { DictionaryEntry } from '@/src/utils/dictionary';

const TERM_SIZE = 26;
const SPARKLE = 14;

type WordOfDayCardProps = {
  entry: DictionaryEntry;
  onPress: () => void;
};

// Mot du jour : carte en relief (ReliefCard) ; toute la carte ouvre la fiche
export default function WordOfDayCard({ entry, onPress }: WordOfDayCardProps) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];

  return (
    <ReliefCard
      onPress={() => {
        tap();
        onPress();
      }}
      accessibilityLabel={`Mot du jour : ${entry.term}. ${entry.definition}`}
      accessibilityHint="Ouvre la fiche du mot"
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
    </ReliefCard>
  );
}

const styles = StyleSheet.create({
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
