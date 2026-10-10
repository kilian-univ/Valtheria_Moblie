import { Ionicons } from '@expo/vector-icons';
import { ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import AppText from '@/src/components/common/AppText';
import BottomSheet from '@/src/components/common/BottomSheet';
import { fonts, palette, size, space, titleLetterSpacing } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import type { Universe } from '@/src/lesson/model';
import type { DiscoveryTile } from '@/src/utils/discoveryHome';
import { universeTint } from '@/src/utils/universeTint';

const TITLE_SIZE = 22;
const BADGE = 40;
const CHECK = 26;

type OtherTopicSheetProps = {
  open: boolean;
  tiles: DiscoveryTile[];
  universes: Universe[];
  onRequestClose: () => void;
  onClosed: () => void;
  onPick: (tile: DiscoveryTile) => void;
};

// Feuille « Un autre sujet ? » : les six leçons découvertes en lignes
// (pastille à la couleur de l'univers, titre, sujet, chevron) ; une leçon
// déjà jouée porte une pastille dorée cochée à la place du chevron.
export default function OtherTopicSheet({ open, tiles, universes, onRequestClose, onClosed, onPick }: OtherTopicSheetProps) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];

  return (
    <BottomSheet open={open} onRequestClose={onRequestClose} onClosed={onClosed}>
      <View style={styles.sheet}>
        <AppText maxFontSizeMultiplier={1.4} style={[styles.title, { color: colors.text }]} accessibilityRole="header">
          Un autre sujet ?
        </AppText>
        <AppText variant="callout" tone="subtitle" style={styles.subtitle}>
          Une minute chacun.
        </AppText>
        {tiles.map((tile, i) => {
          const tint = universeTint(tile.universeSlug, universes);
          return (
            <Pressable
              key={tile.objective}
              onPress={() => onPick(tile)}
              accessibilityRole="button"
              accessibilityLabel={`${tile.title}, ${tile.subject}, 1 minute${tile.played ? ', déjà jouée' : ''}`}
              style={({ pressed }) => [
                styles.row,
                i < tiles.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.controlBorder },
                pressed && { backgroundColor: colors.surface2 },
              ]}
            >
              <View style={[styles.badge, { backgroundColor: tint.face }]}>
                <Ionicons name={tile.icon as ComponentProps<typeof Ionicons>['name']} size={20} color={tint.onFace} />
              </View>
              <View style={styles.texts}>
                <AppText variant="bodyMedium" numberOfLines={2}>
                  {tile.title}
                </AppText>
                <AppText variant="caption" tone="subtitle">{`${tile.subject}, 1 min`}</AppText>
              </View>
              {tile.played ? (
                <View style={[styles.check, { backgroundColor: colors.gold }]}>
                  <Ionicons name="checkmark" size={14} color={colors.onGold} />
                </View>
              ) : (
                <Ionicons name="chevron-forward" size={18} color={colors.subtitle} />
              )}
            </Pressable>
          );
        })}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheet: {
    paddingHorizontal: space[5],
    paddingTop: space[2],
  },
  title: {
    fontFamily: fonts.title,
    fontSize: TITLE_SIZE,
    lineHeight: 28,
    letterSpacing: titleLetterSpacing(TITLE_SIZE),
  },
  subtitle: {
    marginTop: space[1],
    marginBottom: space[2],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[4] - 2,
    minHeight: size.rowMin,
    paddingVertical: space[3] - 1,
    marginHorizontal: -space[5],
    paddingHorizontal: space[5],
  },
  badge: {
    width: BADGE,
    height: BADGE,
    borderRadius: BADGE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  check: {
    width: CHECK,
    height: CHECK,
    borderRadius: CHECK / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
