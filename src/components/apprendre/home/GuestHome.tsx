import { StyleSheet, View } from 'react-native';

import AppText from '@/src/components/common/AppText';
import Button from '@/src/components/common/Button';
import GroundShadow from '@/src/components/common/GroundShadow';
import { StaggerItem } from '@/src/components/common/Stagger';
import { valAccessibilityLabel, ValSpeechBubble } from '@/src/components/common/ValBubble';
import ValFullBody from '@/src/components/common/ValFullBody';
import { ModuleColors, moduleColors, palette, radius, space } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import type { Universe } from '@/src/lesson/model';
import { accountCard, type DiscoveryTile as Tile } from '@/src/utils/discoveryHome';
import { MODULE_COLOR_ORDER, universeColorKey } from '@/src/utils/modulePath';
import { UNIVERSE_ICONS } from '@/src/utils/universes';
import DiscoveryTile from './DiscoveryTile';

const VAL_HEIGHT = 120;
const SHADOW_W = 72;
const SHADOW_H = 10;
const VAL_LINE = 'Choisis un sujet, je t’explique l’essentiel en une minute.';

// Couleur de l'univers conseillé : sa position du serveur si les univers sont
// connus, sinon son rang dans la liste des 15 univers du site (même règle)
function tintFor(slug: string, universes: Universe[]): ModuleColors {
  const known = universes.find((u) => u.slug === slug);
  if (known) return moduleColors[universeColorKey(known)];
  const rank = Math.max(0, Object.keys(UNIVERSE_ICONS).indexOf(slug));
  return moduleColors[MODULE_COLOR_ORDER[rank % MODULE_COLOR_ORDER.length]];
}

type GuestHomeProps = {
  tiles: Tile[];
  universes: Universe[];
  signupClosed: boolean;
  onPlay: (tile: Tile) => void;
  onRegister: () => void;
  onLogin: () => void;
};

// Accueil d'Apprendre sans compte : Val qui salue, les six leçons découvertes
// en grille, puis la carte du compte (inscription ouverte ou fermée)
export default function GuestHome({ tiles, universes, signupClosed, onPlay, onRegister, onLogin }: GuestHomeProps) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const card = accountCard(signupClosed);

  // Grille de 2 colonnes : lignes de deux tuiles de même hauteur
  const rows: Tile[][] = [];
  for (let i = 0; i < tiles.length; i += 2) rows.push(tiles.slice(i, i + 2));

  return (
    <View style={styles.stack}>
      <StaggerItem index={0}>
        <View style={styles.valRow} accessible accessibilityLabel={valAccessibilityLabel(VAL_LINE)}>
          <View>
            <View style={styles.shadow} pointerEvents="none">
              <View style={styles.shadowBox}>
                <GroundShadow width={SHADOW_W} height={SHADOW_H} opacity={0.55} left={0} top={0} />
              </View>
            </View>
            <ValFullBody pose="salut" height={VAL_HEIGHT} />
          </View>
          <ValSpeechBubble text={VAL_LINE} bordered style={styles.bubble} />
        </View>
      </StaggerItem>

      <StaggerItem index={1}>
        <AppText variant="sectionLabel" accessibilityRole="header" style={styles.sectionLabel}>
          Leçons découvertes
        </AppText>
        <View style={styles.grid}>
          {rows.map((row) => (
            <View key={row.map((t) => t.objective).join('-')} style={styles.row}>
              {row.map((tile) => (
                <DiscoveryTile
                  key={tile.objective}
                  tile={tile}
                  tint={tintFor(tile.universeSlug, universes)}
                  onPress={() => onPlay(tile)}
                />
              ))}
              {row.length === 1 ? <View style={styles.filler} /> : null}
            </View>
          ))}
        </View>
      </StaggerItem>

      <StaggerItem index={2}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.controlBorder }]}>
          <AppText variant="title3" accessibilityRole="header">
            {card.title}
          </AppText>
          <AppText variant="callout" tone="subtitle">
            {card.text}
          </AppText>
          <View style={styles.actions}>
            {card.kind === 'open' ? (
              <>
                <Button label="Créer mon compte" onPress={onRegister} />
                <Button variant="text" label="J’ai déjà un compte" onPress={onLogin} />
              </>
            ) : (
              <Button label="J’ai déjà un compte" onPress={onLogin} />
            )}
          </View>
        </View>
      </StaggerItem>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: space[6],
  },
  valRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
  },
  // Sous les pieds de Val, derrière lui
  shadow: {
    position: 'absolute',
    bottom: -SHADOW_H / 2,
    left: 0,
    right: 0,
    alignItems: 'center',
    height: SHADOW_H,
  },
  shadowBox: {
    width: SHADOW_W,
    height: SHADOW_H,
  },
  bubble: {
    flex: 1,
  },
  sectionLabel: {
    marginBottom: space[3],
  },
  grid: {
    gap: space[3],
  },
  row: {
    flexDirection: 'row',
    gap: space[3],
  },
  filler: {
    flex: 1,
  },
  card: {
    gap: space[2],
    padding: space[5],
    borderWidth: 1,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
  },
  actions: {
    marginTop: space[3],
    gap: space[2],
  },
});
