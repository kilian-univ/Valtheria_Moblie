import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import AppText from '@/src/components/common/AppText';
import { fonts, palette, radius, space } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { categoryIcon, categoryLabel } from '@/src/utils/budget/categories';
import type { EnvelopeState } from '@/src/utils/budget/envelopes';
import { euros } from '@/src/utils/budget/format';
import { tap } from '@/src/utils/haptics';

// « Tes enveloppes » (maquette, écrans 4 et 5) : dépensé sur le plafond du
// mois, jauge à la couleur de la catégorie, rouge au-delà du plafond
export default function EnvelopeList({ list, onOpen }: { list: EnvelopeState[]; onOpen: (category: string) => void }) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  return (
    <View style={styles.list}>
      {list.map((e) => {
        const tint = e.over ? colors.error : e.color;
        return (
          <Pressable
            key={e.category}
            onPress={() => {
              tap();
              onOpen(e.category);
            }}
            accessibilityRole="button"
            accessibilityLabel={`Enveloppe ${categoryLabel(e.category)} : ${euros(e.spent)} sur ${euros(e.cap)}${e.over ? ', dépassée' : ''}`}
            accessibilityHint="Changer son plafond"
            style={({ pressed }) => [styles.card, { backgroundColor: pressed ? colors.surface2 : colors.panel }]}
          >
            <View style={styles.head}>
              <Ionicons name={categoryIcon(e.category) as never} size={18} color={e.color} />
              <AppText variant="body" style={styles.name}>
                {categoryLabel(e.category)}
              </AppText>
              <AppText variant="callout">
                <AppText variant="callout" style={[styles.bold, e.over && { color: colors.error }]}>
                  {euros(e.spent)}
                </AppText>
                <AppText variant="callout" tone="subtitle">
                  {' '}
                  sur {euros(e.cap)}
                </AppText>
              </AppText>
            </View>
            <View style={[styles.track, { backgroundColor: colors.track }]}>
              <View style={[styles.fill, { width: `${Math.min(100, Math.round(e.ratio * 100))}%`, backgroundColor: tint }]} />
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: space[2] },
  card: { paddingVertical: space[3], paddingHorizontal: 14, borderRadius: radius.card, borderCurve: 'continuous', minHeight: 44 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  name: { flex: 1, fontFamily: fonts.bodySemibold },
  bold: { fontFamily: fonts.bodyBold },
  track: { marginTop: space[2], height: 6, borderRadius: 999, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 999 },
});
