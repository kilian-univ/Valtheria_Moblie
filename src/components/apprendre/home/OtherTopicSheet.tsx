import { Ionicons } from '@expo/vector-icons';
import { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';

import AppText from '@/src/components/common/AppText';
import BottomSheet from '@/src/components/common/BottomSheet';
import ListRow from '@/src/components/common/ListRow';
import { fonts, palette, space, titleLetterSpacing } from '@/src/constants/style/Style';
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
            <ListRow
              key={tile.objective}
              compact
              bleed={space[5]}
              last={i === tiles.length - 1}
              title={tile.title}
              subtitle={`${tile.subject}, 1 min`}
              accessibilityLabel={`${tile.title}, ${tile.subject}, 1 minute${tile.played ? ', déjà jouée' : ''}`}
              onPress={() => onPick(tile)}
              leading={
                <View style={[styles.badge, { backgroundColor: tint.face }]}>
                  <Ionicons name={tile.icon as ComponentProps<typeof Ionicons>['name']} size={20} color={tint.onFace} />
                </View>
              }
              // Déjà jouée : pastille dorée cochée à la place du chevron
              trailing={
                tile.played ? (
                  <View style={[styles.check, { backgroundColor: colors.gold }]}>
                    <Ionicons name="checkmark" size={14} color={colors.onGold} />
                  </View>
                ) : undefined
              }
              showChevron={!tile.played}
            />
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
  badge: {
    width: BADGE,
    height: BADGE,
    borderRadius: BADGE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: {
    width: CHECK,
    height: CHECK,
    borderRadius: CHECK / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
