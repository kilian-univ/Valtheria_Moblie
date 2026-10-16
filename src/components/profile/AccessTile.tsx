import { ReactNode } from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import AppText from '@/src/components/common/AppText';
import { fonts, palette, radius, space } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { tap } from '@/src/utils/haptics';

const ICON = 40;

type AccessTileProps = {
  // Icône dans son carré (ou sa médaille), 40 px
  icon: ReactNode;
  // « 12 déclics » : le nombre en gras, le mot atténué ; ou une phrase seule
  // (état vide)
  value?: string;
  unit?: string;
  caption: string;
  onPress: () => void;
  accessibilityLabel: string;
  accessibilityHint: string;
  style?: StyleProp<ViewStyle>;
};

// Accès du profil (carnet, médailles, mots) : icône, chiffre, légende
export default function AccessTile({ icon, value, unit, caption, onPress, accessibilityLabel, accessibilityHint, style }: AccessTileProps) {
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
      style={({ pressed }) => [styles.tile, { backgroundColor: pressed ? colors.surface2 : colors.panel }, style]}
    >
      <View style={styles.icon}>{icon}</View>
      <View style={styles.texts}>
        {value ? (
          <AppText maxFontSizeMultiplier={1.3} style={styles.value} numberOfLines={1}>
            {value}
            {unit ? <AppText style={[styles.unit, { color: colors.subtitle }]}>{` ${unit}`}</AppText> : null}
          </AppText>
        ) : null}
        <AppText variant="caption" tone="subtitle" maxFontSizeMultiplier={1.3} numberOfLines={2}>
          {caption}
        </AppText>
      </View>
    </Pressable>
  );
}

// Carré d'icône teinté (carnet en or pâle, mots en bleu pâle)
export function IconSquare({ background, children }: { background: string; children: ReactNode }) {
  return <View style={[styles.square, { backgroundColor: background }]}>{children}</View>;
}

const styles = StyleSheet.create({
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2] + 2,
    padding: space[3],
    borderRadius: radius.card,
    borderCurve: 'continuous',
  },
  icon: {
    width: ICON,
    height: ICON,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: {
    flex: 1,
  },
  value: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    lineHeight: 19,
  },
  unit: {
    fontFamily: fonts.bodyMedium,
  },
  square: {
    width: ICON,
    height: ICON,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
