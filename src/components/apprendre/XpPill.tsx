import { StyleSheet, Text, View } from 'react-native';

import { fonts, palette, radius, space } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { formatXp } from '@/src/utils/format';

const HEIGHT = 28;
const FONT_SIZE = 13;

// Pastille « + 20 XP » : fond goldSoft, texte doré
export default function XpPill({ xp }: { xp: number }) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];

  return (
    <View style={[styles.pill, { backgroundColor: colors.goldSoft }]}>
      <Text maxFontSizeMultiplier={1.3} style={[styles.text, { color: colors.gold }]}>
        {formatXp(xp)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    minHeight: HEIGHT,
    borderRadius: radius.pill,
    paddingHorizontal: space[3],
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  text: {
    fontFamily: fonts.bodySemibold,
    fontSize: FONT_SIZE,
    lineHeight: 16,
  },
});
