import { Ionicons } from '@expo/vector-icons';
import { ComponentProps, ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import AppText from '@/src/components/common/AppText';
import { fonts, palette, radius, size, space } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { tap } from '@/src/utils/haptics';

type IconName = ComponentProps<typeof Ionicons>['name'];

const ROW_MIN = 52;
const ICON = 20;

// Groupe de réglages : titre de section en or, puis une carte de lignes
export function SettingsSection({ title, children }: { title: string; children: ReactNode }) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  return (
    <View style={styles.section}>
      <AppText variant="sectionLabel" accessibilityRole="header" style={styles.sectionTitle}>
        {title.toUpperCase()}
      </AppText>
      <View style={[styles.group, { backgroundColor: colors.optionFace }]}>{children}</View>
    </View>
  );
}

type SettingsRowProps = {
  icon: IconName;
  label: string;
  value?: string;
  // Ligne touchable : un chevron à droite (sauf chevron={false})
  onPress?: () => void;
  chevron?: boolean;
  // Ligne grisée, jamais rouge (suppression du compte)
  muted?: boolean;
  // Contrôle à droite (interrupteur) à la place de la valeur
  control?: ReactNode;
  last?: boolean;
  accessibilityHint?: string;
};

// Ligne de réglage : icône, libellé, valeur ou contrôle, chevron
export function SettingsRow({ icon, label, value, onPress, chevron = true, muted, control, last, accessibilityHint }: SettingsRowProps) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const body = (
    <>
      <Ionicons name={icon} size={ICON} color={colors.subtitle} />
      <AppText variant="bodyMedium" tone={muted ? 'subtitle' : 'text'} style={styles.label}>
        {label}
      </AppText>
      {control ??
        (value ? (
          <AppText variant="callout" tone="subtitle" numberOfLines={1} style={styles.value}>
            {value}
          </AppText>
        ) : null)}
      {onPress && chevron ? <Ionicons name="chevron-forward" size={16} color={colors.textFaint} /> : null}
    </>
  );
  const rowStyle = [styles.row, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }];
  if (!onPress) {
    return (
      <View style={rowStyle} accessible={!control} accessibilityLabel={value ? `${label}, ${value}` : label}>
        {body}
      </View>
    );
  }
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={value ? `${label}, ${value}` : label}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [...rowStyle, pressed && { backgroundColor: colors.surface2 }]}
    >
      {body}
    </Pressable>
  );
}

// Styles de ligne pour les réglages qui gardent leur propre composant
// (rappel quotidien, sons)
export function useSettingsRowStyles(last = false) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  return {
    rowStyle: [styles.row, styles.rowSpread, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }],
    leftStyle: styles.left,
    labelStyle: styles.labelText,
  };
}

const styles = StyleSheet.create({
  section: {
    gap: space[2],
  },
  sectionTitle: {
    marginHorizontal: space[1],
  },
  group: {
    borderRadius: radius.card,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3] + 2,
    minHeight: Math.max(ROW_MIN, size.tapMin),
    paddingHorizontal: space[4],
    paddingVertical: space[2],
  },
  rowSpread: {
    justifyContent: 'space-between',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3] + 2,
    flex: 1,
  },
  label: {
    flex: 1,
  },
  labelText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
    lineHeight: 22,
  },
  value: {
    maxWidth: '50%',
  },
});
