import { Pressable, StyleSheet, View } from 'react-native';

import AppText from '@/src/components/common/AppText';
import ProgressRing from '@/src/components/common/ProgressRing';
import { palette, radius, space } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { tap } from '@/src/utils/haptics';

const RING = 48;
const STROKE = 5;

type RingTileProps = {
  // Valeur au centre de l'anneau (« 1/6 », « 14 »)
  value: string;
  ratio: number;
  title: string;
  caption: string;
  color?: string;
  // Lu par VoiceOver : la valeur et l'action
  accessibilityLabel: string;
  accessibilityHint: string;
  onPress: () => void;
};

// Anneau avec son titre, touchable (médailles, mots découverts). L'anneau se
// remplit à l'apparition.
export default function RingTile({ value, ratio, title, caption, color, accessibilityLabel, accessibilityHint, onPress }: RingTileProps) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [styles.tile, { backgroundColor: pressed ? colors.surface2 : colors.panel }]}
    >
      <ProgressRing progress={ratio} diameter={RING} stroke={STROKE} label={value} labelSize={12} color={color} animated delay={150} />
      <View style={styles.texts}>
        <AppText variant="bodyMedium" maxFontSizeMultiplier={1.3} style={styles.title} numberOfLines={1}>
          {title}
        </AppText>
        <AppText variant="caption" tone="subtitle" maxFontSizeMultiplier={1.3} numberOfLines={2}>
          {caption}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2] + 2,
    padding: space[3],
    borderRadius: radius.card,
    borderCurve: 'continuous',
  },
  texts: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    lineHeight: 18,
  },
});
