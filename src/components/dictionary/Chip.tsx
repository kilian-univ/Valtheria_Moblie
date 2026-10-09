import { Ionicons } from '@expo/vector-icons';
import { ComponentProps } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import AppText from '@/src/components/common/AppText';
import { fonts, palette, radius, space } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';

const HEIGHT = 36;
const ICON = 14;

type ChipProps = {
  label: string;
  onPress: () => void;
  icon?: ComponentProps<typeof Ionicons>['name'];
  // Active : bordure dorée, fond goldSoft, texte doré
  active?: boolean;
  accessibilityHint?: string;
};

// Pastille du dictionnaire : récents, catégories, suggestions
export default function Chip({ label, onPress, icon, active = false, accessibilityHint }: ChipProps) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const tint = active ? colors.gold : colors.text;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [
        styles.chip,
        {
          borderColor: active ? colors.gold : colors.controlBorder,
          backgroundColor: active ? colors.goldSoft : pressed ? colors.surface2 : colors.surface,
        },
      ]}
    >
      {icon ? <Ionicons name={icon} size={ICON} color={active ? colors.gold : colors.subtitle} /> : null}
      <AppText maxFontSizeMultiplier={1.3} numberOfLines={1} style={[styles.label, { color: tint }]}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1] + 2,
    paddingHorizontal: space[3] + 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    maxWidth: 260,
  },
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    lineHeight: 18,
    flexShrink: 1,
  },
});
