import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import AppText from '@/src/components/common/AppText';
import { fonts, palette, radius, space, titleLetterSpacing } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { tap } from '@/src/utils/haptics';

const QUOTE_SIZE = 17;

type NotebookCardProps = {
  count: number;
  // Dernier déclic (citation courte, voir shortQuote) ; null : carnet vide
  latest: string | null;
  onPress: () => void;
};

// Carte « TON CARNET » : une seule carte touchable, qui ouvre le carnet
export default function NotebookCard({ count, latest, onPress }: NotebookCardProps) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const head = count > 0 ? `TON CARNET · ${count} ${count > 1 ? 'DÉCLICS' : 'DÉCLIC'}` : 'TON CARNET';
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={
        latest
          ? `Ton carnet, ${count} ${count > 1 ? 'déclics' : 'déclic'}. Dernier : ${latest}`
          : 'Ton carnet. Il se remplit à chaque leçon terminée.'
      }
      accessibilityHint={latest ? 'Ouvre ton carnet et le test sur tes déclics' : 'Ouvre ton carnet'}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: pressed ? colors.surface2 : colors.optionFace, borderColor: colors.goldLine },
      ]}
    >
      <View style={styles.head}>
        <View style={styles.kickerRow}>
          <Ionicons name="sparkles-outline" size={14} color={colors.gold} />
          <AppText maxFontSizeMultiplier={1.3} style={[styles.kicker, { color: colors.gold }]}>
            {head}
          </AppText>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.subtitle} />
      </View>
      {latest ? (
        <>
          <AppText maxFontSizeMultiplier={1.4} style={styles.quote} numberOfLines={3}>
            {latest}
          </AppText>
          <AppText maxFontSizeMultiplier={1.4} style={[styles.action, { color: colors.gold }]}>
            Me tester sur mes déclics
          </AppText>
        </>
      ) : (
        <AppText variant="callout" tone="subtitle" style={styles.empty}>
          Ton carnet se remplit à chaque leçon terminée.
        </AppText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: space[4],
    borderRadius: radius.card + 2,
    borderCurve: 'continuous',
    borderWidth: 1,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  kickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    flexShrink: 1,
  },
  kicker: {
    fontFamily: fonts.bodyExtraBold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.2,
  },
  quote: {
    fontFamily: fonts.title,
    fontSize: QUOTE_SIZE,
    lineHeight: 23,
    letterSpacing: titleLetterSpacing(QUOTE_SIZE),
    marginTop: space[2],
  },
  action: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    lineHeight: 18,
    marginTop: space[2] + 2,
  },
  empty: {
    marginTop: space[2],
  },
});
