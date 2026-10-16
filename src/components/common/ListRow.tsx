import { Ionicons } from '@expo/vector-icons';
import { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { fonts, opacityDisabled, palette, size, space, titleLetterSpacing } from '@/src/constants/style/Style';
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
  // Élément à droite, avant le chevron (anneau de progression…)
  trailing?: ReactNode;
  // Élément sous le sous-titre (barre de progression…)
  footer?: ReactNode;
  // Dernière ligne du groupe : pas de filet en bas
  last?: boolean;
  onPress?: () => void;
  accessibilityHint?: string;
  // Lu à la place de « titre, valeur, sous-titre »
  accessibilityLabel?: string;
  // Ligne compacte (listes de feuille) : marge verticale de 11, sous-titre
  // en caption, filet fin, 14 entre l'élément de gauche et le texte, titre
  // sur deux lignes au plus
  compact?: boolean;
  // Marge horizontale du conteneur : la ligne déborde d'autant, pour que
  // l'appui s'éclaire jusqu'aux bords (le texte reste aligné sur la marge)
  bleed?: number;
  // Titre en Fraunces 17 (liste des modules d'un univers)
  serif?: boolean;
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
const SERIF_SIZE = 17;

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
  trailing,
  footer,
  last = false,
  locked = false,
  lockedReason,
  onPress,
  accessibilityHint,
  accessibilityLabel: labelOverride,
  compact = false,
  bleed,
  serif = false,
}: ListRowProps) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const interactive = !!onPress && !locked;
  const shownSubtitle = locked ? lockedReason : subtitle;

  const accessibilityLabel =
    labelOverride ??
    [title, value, locked ? `verrouillée, ${lockedReason}` : subtitle].filter(Boolean).join(', ');

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
        compact && styles.compactRow,
        bleed !== undefined && { marginHorizontal: -bleed, paddingHorizontal: bleed },
        !last &&
          (compact
            ? { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.controlBorder }
            : { borderBottomWidth: 1, borderBottomColor: colors.border }),
        pressed && interactive && { backgroundColor: colors.surface2 },
        locked && styles.locked,
      ]}
    >
      {leading ? <View style={styles.leading}>{leading}</View> : null}

      <View style={[styles.texts, compact && styles.compactTexts]}>
        <AppText variant="bodyMedium" numberOfLines={compact ? 2 : undefined} style={serif && styles.serifTitle}>
          {title}
        </AppText>
        {shownSubtitle ? (
          <AppText variant={compact ? 'caption' : 'callout'} tone="subtitle">
            {shownSubtitle}
          </AppText>
        ) : null}
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </View>

      {value ? (
        <AppText variant="bodyMedium" tone={VALUE_TONE[valueTone]} style={styles.value}>
          {value}
        </AppText>
      ) : null}

      {trailing}

      {showChevron ? <Ionicons name="chevron-forward" size={CHEVRON_SIZE} color={colors.subtitle} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  serifTitle: {
    fontFamily: fonts.title,
    fontSize: SERIF_SIZE,
    lineHeight: 21,
    letterSpacing: titleLetterSpacing(SERIF_SIZE),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    minHeight: size.rowMin,
    paddingVertical: space[4],
    paddingHorizontal: space[4],
  },
  compactRow: {
    gap: space[4] - 2,
    paddingVertical: space[3] - 1,
  },
  compactTexts: {
    minWidth: 0,
  },
  leading: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: {
    flex: 1,
    gap: 2, // titre et sous-titre forment un seul bloc
  },
  footer: {
    marginTop: space[2],
  },
  value: {
    fontVariant: ['tabular-nums'],
    textAlign: 'right',
  },
  locked: {
    opacity: opacityDisabled,
  },
});
