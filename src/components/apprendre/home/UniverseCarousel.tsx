import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import AppText from '@/src/components/common/AppText';
import UniverseArt from '@/src/components/common/UniverseArt';
import {
  fonts,
  learnHome,
  levelTone,
  moduleColors,
  palette,
  radius,
  space,
  titleLetterSpacing,
  withOpacity,
} from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import type { Universe } from '@/src/lesson/model';
import { tap } from '@/src/utils/haptics';
import { universePill } from '@/src/utils/levels';
import { universeColorKey } from '@/src/utils/modulePath';
import type { UniverseEntry } from '@/src/utils/universes';

const BAR = 4;
const SNAP = learnHome.tileWidth + learnHome.tileGap;

type UniverseCarouselProps = {
  entries: UniverseEntry[];
  objectiveSlug: string | null;
  // Marge de la page : le carrousel déborde jusqu'aux bords de l'écran
  bleed: number;
  onOpen: (universe: Universe) => void;
};

// Carrousel horizontal « TES UNIVERS » : une carte par univers, son
// illustration sur son halo, son nom, le niveau atteint et une fine barre
// de progression à sa couleur
export default function UniverseCarousel({ entries, objectiveSlug, bleed, onOpen }: UniverseCarouselProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      snapToInterval={SNAP}
      decelerationRate="fast"
      style={{ marginHorizontal: -bleed }}
      contentContainerStyle={[styles.content, { paddingHorizontal: bleed }]}
    >
      {entries.map((entry) => (
        <UniverseTile
          key={entry.universe.id}
          entry={entry}
          objective={entry.universe.slug === objectiveSlug}
          onPress={() => onOpen(entry.universe)}
        />
      ))}
    </ScrollView>
  );
}

function UniverseTile({ entry, objective, onPress }: { entry: UniverseEntry; objective: boolean; onPress: () => void }) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const color = moduleColors[universeColorKey(entry.universe)].face;
  const pill = universePill(entry.modules);
  const pillColor = pill.level ? colors[levelTone[pill.level] ?? 'gold'] : colors.subtitle;
  const percent = Math.round(entry.progress * 100);

  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={[
        entry.universe.name,
        objective ? 'ton objectif' : null,
        pill.label,
        percent > 0 ? `${percent} % terminé` : null,
      ]
        .filter(Boolean)
        .join(', ')}
      style={({ pressed }) => [
        styles.tile,
        { backgroundColor: colors.cardSurface, borderColor: colors.cardBorder },
        pressed && styles.pressed,
      ]}
    >
      <View>
        <UniverseArt slug={entry.universe.slug} color={color} size={learnHome.tileWidth} height={learnHome.tileArt} framed radius={0} />
        {objective ? (
          <View style={[styles.badge, { backgroundColor: withOpacity(colors.background, 0.7) }]}>
            <AppText maxFontSizeMultiplier={1.2} style={[styles.badgeText, { color: colors.gold }]}>
              TON OBJECTIF
            </AppText>
          </View>
        ) : null}
      </View>
      <View style={styles.body}>
        <AppText maxFontSizeMultiplier={1.3} style={styles.name} numberOfLines={2}>
          {entry.universe.name}
        </AppText>
        <View style={[styles.pill, { backgroundColor: withOpacity(pill.level ? pillColor : colors.text, 0.12) }]}>
          <AppText maxFontSizeMultiplier={1.2} style={[styles.pillText, { color: pillColor }]}>
            {pill.label.toUpperCase()}
          </AppText>
        </View>
        <View style={styles.trackGap} />
        <View style={[styles.track, { backgroundColor: colors.track }]}>
          <View style={[styles.fill, { width: `${percent}%`, backgroundColor: color }]} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: learnHome.tileGap,
  },
  tile: {
    width: learnHome.tileWidth,
    borderRadius: learnHome.tileRadius,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth * 2,
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.85,
  },
  badge: {
    position: 'absolute',
    left: 10,
    top: 10,
    height: 22,
    paddingHorizontal: space[2],
    borderRadius: radius.pill,
    justifyContent: 'center',
  },
  badgeText: {
    fontFamily: fonts.bodyExtraBold,
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 0.6,
  },
  // La barre reste en bas, même sous un nom sur deux lignes
  body: {
    flex: 1,
    padding: space[3],
  },
  name: {
    fontFamily: fonts.title,
    fontSize: learnHome.tileName,
    lineHeight: 22,
    letterSpacing: titleLetterSpacing(learnHome.tileName),
  },
  pill: {
    alignSelf: 'flex-start',
    height: 22,
    paddingHorizontal: space[2],
    borderRadius: radius.pill,
    justifyContent: 'center',
    marginTop: 6,
  },
  pillText: {
    fontFamily: fonts.bodyExtraBold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.6,
  },
  track: {
    height: BAR,
    borderRadius: radius.pill,
    marginTop: 'auto',
    overflow: 'hidden',
  },
  trackGap: {
    height: 10,
  },
  fill: {
    height: '100%',
    borderRadius: radius.pill,
  },
});
