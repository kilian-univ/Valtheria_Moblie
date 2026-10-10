import { Ionicons } from '@expo/vector-icons';
import { ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import AppText from '@/src/components/common/AppText';
import { springs } from '@/src/constants/motion';
import { fonts, ModuleColors, palette, reliefDepth, space } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import type { DiscoveryTile as Tile } from '@/src/utils/discoveryHome';
import { tap } from '@/src/utils/haptics';

const RADIUS = 16;
const BADGE = 44;
const CHECK = 22;
const SINK_DURATION = 80; // comme le bouton principal

type DiscoveryTileProps = {
  tile: Tile;
  // Couleur de l'univers conseillé
  tint: ModuleColors;
  onPress: () => void;
};

// Tuile en relief d'une leçon découverte (accueil sans compte) : pastille à la
// couleur de l'univers avec l'icône de l'objectif, titre, sujet, durée. Déjà
// jouée : pastille dorée cochée et « Rejouer ». S'enfonce sur sa tranche à
// l'appui, comme les boutons en relief.
export default function DiscoveryTile({ tile, tint, onPress }: DiscoveryTileProps) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const reduced = useReducedMotion();
  const press = useSharedValue(0);

  const faceStyle = useAnimatedStyle(() => ({ transform: [{ translateY: press.get() * reliefDepth }] }));

  const label = [
    tile.forYou ? 'Pour toi' : null,
    tile.title,
    tile.subject,
    '1 minute',
    tile.played ? 'Déjà jouée, rejouer' : null,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      onPressIn={() => press.set(reduced ? 1 : withTiming(1, { duration: SINK_DURATION }))}
      onPressOut={() => press.set(reduced ? 0 : withSpring(0, springs.press))}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={styles.wrap}
    >
      <View style={[styles.edge, { backgroundColor: colors.surfaceEdge }]} />
      <Animated.View style={[styles.face, { backgroundColor: colors.surface }, faceStyle]}>
        <View style={styles.top}>
          <View style={[styles.badge, { backgroundColor: tint.face }]}>
            <Ionicons name={tile.icon as ComponentProps<typeof Ionicons>['name']} size={22} color={tint.onFace} />
          </View>
          {tile.played ? (
            <View style={[styles.check, { backgroundColor: colors.gold }]}>
              <Ionicons name="checkmark" size={14} color={colors.onGold} />
            </View>
          ) : null}
        </View>
        {tile.forYou ? (
          <AppText variant="sectionLabel" tone="gold">
            Pour toi
          </AppText>
        ) : null}
        <AppText style={[styles.title, { color: colors.text }]} numberOfLines={3}>
          {tile.title}
        </AppText>
        <View style={styles.meta}>
          <AppText variant="caption" tone="subtitle" numberOfLines={1} style={styles.subject}>
            {tile.subject}
          </AppText>
          <AppText variant="caption" tone={tile.played ? 'gold' : 'subtitle'}>
            {tile.played ? 'Rejouer' : '1 min'}
          </AppText>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    paddingBottom: reliefDepth,
  },
  edge: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: reliefDepth,
    borderRadius: RADIUS,
    borderCurve: 'continuous',
  },
  face: {
    flex: 1,
    gap: space[2],
    padding: space[4],
    borderRadius: RADIUS,
    borderCurve: 'continuous',
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: space[1],
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
  title: {
    fontFamily: fonts.bodySemibold,
    fontSize: 16,
    lineHeight: 21,
  },
  meta: {
    marginTop: 'auto',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: space[2],
  },
  subject: {
    flexShrink: 1,
  },
});
