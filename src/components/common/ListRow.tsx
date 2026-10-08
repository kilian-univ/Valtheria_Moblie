import { Ionicons } from '@expo/vector-icons';
import { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { opacityDisabled, palette, size, space } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import AppText, { TextTone } from './AppText';

export type ValueTone = 'default' | 'success' | 'danger';

type BaseProps = {
  title: string;
  subtitle?: string;
  value?: string;
  valueTone?: ValueTone;
  // Élément à gauche (icône, pastille, avatar)
  leading?: ReactNode;
  showChevron?: boolean;
  // Dernière ligne du groupe : pas de filet en bas
  last?: boolean;
  onPress?: () => void;
  accessibilityHint?: string;
};

// Verrouillée : estompée, non touchable, et la raison est obligatoire.
// Elle remplace le sous-titre et elle est lue par le lecteur d'écran.
type LockProps =
  | { locked?: false; lockedReason?: undefined }
  | { locked: true; lockedReason: string };

type ListRowProps = BaseProps & LockProps;

const VALUE_TONE: Record<ValueTone, TextTone> = {
  default: 'text',
  success: 'success',
  danger: 'error',
};

const CHEVRON_SIZE = 18;

// Ligne de liste : titre, sous-titre, valeur à droite. Le lecteur d'écran la
// lit d'un seul bloc. Pas d'échelle à l'appui : une ligne pleine largeur
// s'éclaire au lieu de rétrécir.
export default function ListRow({
  title,
  subtitle,
  value,
  valueTone = 'default',
  leading,
  showChevron = false,
  last = false,
  locked = false,
  lockedReason,
  onPress,
  accessibilityHint,
}: ListRowProps) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const interactive = !!onPress && !locked;
  const shownSubtitle = locked ? lockedReason : subtitle;

  const accessibilityLabel = [title, value, locked ? `verrouillée, ${lockedReason}` : subtitle]
    .filter(Boolean)
    .join(', ');

  return (
    <Pressable
      onPress={onPress}
      disabled={!interactive}
      accessible
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={onPress ? { disabled: locked } : undefined}
      style={({ pressed }) => [
        styles.row,
        !last && { borderBottomWidth: 1, borderBottomColor: colors.border },
        pressed && interactive && { backgroundColor: colors.surface2 },
        locked && styles.locked,
      ]}
    >
      {leading ? <View style={styles.leading}>{leading}</View> : null}

      <View style={styles.texts}>
        <AppText variant="bodyMedium">{title}</AppText>
        {shownSubtitle ? (
          <AppText variant="callout" tone="subtitle">
            {shownSubtitle}
          </AppText>
        ) : null}
      </View>

      {value ? (
        <AppText variant="bodyMedium" tone={VALUE_TONE[valueTone]} style={styles.value}>
          {value}
        </AppText>
      ) : null}

      {showChevron ? <Ionicons name="chevron-forward" size={CHEVRON_SIZE} color={colors.subtitle} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    minHeight: size.rowMin,
    paddingVertical: space[4],
    paddingHorizontal: space[4],
  },
  leading: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: {
    flex: 1,
    gap: 2, // titre et sous-titre forment un seul bloc
  },
  value: {
    fontVariant: ['tabular-nums'],
    textAlign: 'right',
  },
  locked: {
    opacity: opacityDisabled,
  },
});
