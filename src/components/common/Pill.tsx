import { Ionicons } from '@expo/vector-icons';
import { ComponentProps } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { fonts, radius, space } from '@/src/constants/style/Style';
import AppText from './AppText';

type IconName = ComponentProps<typeof Ionicons>['name'];

// badge : capitales en petit (« LEÇON TERMINÉE »), 26 de haut
// md : pastille d'information (bienvenue), 32 de haut, filet fin
// sm : petite pastille de chiffre (XP, gels)
// lg : verdict mis en avant (révélation d'une leçon), 38 de haut
export type PillSize = 'badge' | 'md' | 'sm' | 'lg';

type PillProps = {
  label: string;
  size?: PillSize;
  icon?: IconName;
  // Couleurs : fond, texte et icône, filet éventuel
  background: string;
  color: string;
  iconColor?: string;
  borderColor?: string;
  // Lu à la place du libellé (capitales épelées, unités)
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

const ICON_SIZE: Record<PillSize, number> = { badge: 14, md: 15, sm: 12, lg: 18 };

// Pastille non touchable : fond arrondi, icône facultative, libellé court
export default function Pill({
  label,
  size = 'md',
  icon,
  background,
  color,
  iconColor,
  borderColor,
  accessibilityLabel,
  style,
}: PillProps) {
  return (
    <View
      style={[
        styles.pill,
        styles[size],
        { backgroundColor: background },
        borderColor ? { borderColor, borderWidth: StyleSheet.hairlineWidth } : null,
        style,
      ]}
      accessible
      accessibilityLabel={accessibilityLabel ?? label}
    >
      {icon ? <Ionicons name={icon} size={ICON_SIZE[size]} color={iconColor ?? color} /> : null}
      <AppText
        variant="caption"
        maxFontSizeMultiplier={1.3}
        style={[
          size === 'badge' ? styles.badgeText : size === 'sm' ? styles.smText : size === 'lg' ? styles.lgText : null,
          { color },
        ]}
      >
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
  },
  badge: {
    minHeight: 26,
    gap: 6,
    paddingHorizontal: space[3] - 2,
  },
  md: {
    minHeight: 32,
    gap: 6,
    paddingHorizontal: space[3],
  },
  lg: {
    minHeight: 38,
    gap: space[2],
    paddingHorizontal: space[4],
  },
  sm: {
    gap: 3,
    paddingHorizontal: space[2] + 2,
    paddingVertical: 3,
  },
  badgeText: {
    fontFamily: fonts.bodyExtraBold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1,
  },
  lgText: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    lineHeight: 20,
  },
  smText: {
    fontFamily: fonts.bodySemibold,
    fontVariant: ['tabular-nums'],
  },
});
