import { Pressable, StyleSheet, Text, View } from 'react-native';

import Skeleton from '@/src/components/common/Skeleton';
import ValsCoin from '@/src/components/common/ValsCoin';
import { fonts, palette, radius, space } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { formatInteger } from '@/src/utils/format';

export const PILL_HEIGHT = 36;
const PILL_TEXT = { fontFamily: fonts.bodySemibold, fontSize: 15, lineHeight: 20 } as const;
const COIN_SIZE = 18;
// Seul emoji autorisé de l'app (validé) : la flamme de la série
const FLAME = '\u{1F525}';

type StatPillsProps = {
  streak: number;
  vals: number;
  onStreak: () => void;
};

// Pastilles « série » et « Vals » (accueil, page module)
export default function StatPills({ streak, vals, onStreak }: StatPillsProps) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];

  return (
    <>
      <Pressable
        onPress={onStreak}
        accessibilityRole="button"
        accessibilityLabel={`Série de ${streak} ${streak > 1 ? 'jours' : 'jour'}`}
        accessibilityHint="Ouvre le détail de ta série"
        hitSlop={{ top: 4, bottom: 4 }}
        style={({ pressed }) => [styles.pill, { backgroundColor: pressed ? colors.surface2 : colors.surface }]}
      >
        <Text maxFontSizeMultiplier={1.2} style={PILL_TEXT}>
          {FLAME}
        </Text>
        <Text maxFontSizeMultiplier={1.2} style={[PILL_TEXT, { color: streak > 0 ? colors.text : colors.subtitle }]}>
          {formatInteger(streak)}
        </Text>
      </Pressable>

      <View accessible accessibilityLabel={`${vals} Vals`} style={[styles.pill, { backgroundColor: colors.surface }]}>
        <ValsCoin size={COIN_SIZE} />
        <Text maxFontSizeMultiplier={1.2} style={[PILL_TEXT, { color: colors.text }]}>
          {formatInteger(vals)}
        </Text>
      </View>
    </>
  );
}

// Les deux pastilles en squelette (chiffres pas encore chargés)
export function StatPillsSkeleton() {
  return (
    <>
      <Skeleton width={58} height={PILL_HEIGHT} shape="pill" />
      <Skeleton width={64} height={PILL_HEIGHT} shape="pill" />
    </>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1],
    height: PILL_HEIGHT,
    paddingHorizontal: space[3],
    borderRadius: radius.pill,
  },
});
