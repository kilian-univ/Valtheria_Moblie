import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import AppText from '@/src/components/common/AppText';
import { fonts, palette, radius, space, titleLetterSpacing, universeCard, withOpacity } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { useRollingNumber } from '@/src/hooks/useRollingNumber';
import { tap } from '@/src/utils/haptics';
import { glowStops } from '@/src/utils/universeGlow';

const TITLE_SIZE = 22;
const BAR = 8;
const DOT = 32;
const PAD = 16;

type UniverseCardProps = {
  // Couleur de l'univers (face de moduleColors)
  color: string;
  // Petites capitales à la couleur de l'univers (« TON OBJECTIF »)
  label: string;
  // Action à droite du libellé (crayon…)
  labelAction?: ReactNode;
  title: string;
  done: number;
  total: number;
  // La suite : titre de la prochaine leçon et son ouverture
  next?: { title: string; onPress: () => void; accessibilityLabel?: string } | null;
  // Univers terminé : le message, et un lien éventuel (univers suivant)
  finished?: { title: string; link?: { label: string; onPress: () => void } } | null;
  // Aucune leçon publiée : ce message à la place de la barre et du compte
  emptyMessage?: string | null;
};

// Carte de couleur sombre : fond blanc à 3 %, filet fin, liseré vertical à la
// couleur de l'univers, et une lueur de cette couleur dont l'étendue SUIT LA
// PROGRESSION (utils/universeGlow). La lueur glisse vers sa nouvelle position
// quand la progression change (animations réduites : directement). Texte
// toujours ivoire ou atténué, jamais sombre sur un aplat de couleur.
export default function UniverseCard({ color, label, labelAction, title, done, total, next, finished, emptyMessage }: UniverseCardProps) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const ratio = total > 0 ? Math.min(1, done / total) : 0;
  // Défilement doux de la lueur et de la barre (useRollingNumber : 350 ms)
  const shown = useRollingNumber(ratio);
  const stops = glowStops(shown);
  const onColor = colors.background;

  return (
    <View style={[styles.card, { backgroundColor: colors.cardSurface, borderColor: colors.cardBorder }]}>
      <LinearGradient
        colors={stops.map((s) => withOpacity(color, s.opacity)) as [string, string, ...string[]]}
        locations={stops.map((s) => s.at) as [number, number, ...number[]]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <View style={[styles.bar, { backgroundColor: color }]} />

      <View style={styles.head}>
        <AppText maxFontSizeMultiplier={1.3} style={[styles.label, { color }]}>
          {label.toUpperCase()}
        </AppText>
        {labelAction}
      </View>
      <AppText maxFontSizeMultiplier={1.3} style={styles.title} accessibilityRole="header">
        {title}
      </AppText>

      {emptyMessage ? (
        <AppText variant="callout" tone="subtitle" style={styles.empty}>
          {emptyMessage}
        </AppText>
      ) : (
        <View
          style={styles.progress}
          accessible
          accessibilityLabel={`${done} ${done > 1 ? 'leçons terminées' : 'leçon terminée'} sur ${total}`}
        >
          <View style={[styles.track, { backgroundColor: colors.track }]}>
            <View style={[styles.fill, { width: `${Math.round(shown * 1000) / 10}%`, backgroundColor: color }]} />
          </View>
          <AppText maxFontSizeMultiplier={1.3} style={styles.count}>
            {`${done} / ${total}`}
          </AppText>
        </View>
      )}

      {finished ? (
        <View style={styles.finished}>
          <View style={styles.nextRow}>
            <View style={[styles.dot, { backgroundColor: color }]}>
              <Ionicons name="checkmark" size={16} color={onColor} />
            </View>
            <AppText variant="bodyMedium" style={styles.nextTitle}>
              {finished.title}
            </AppText>
          </View>
          {finished.link ? <NextRow color={color} onColor={onColor} title={finished.link.label} onPress={finished.link.onPress} /> : null}
        </View>
      ) : next ? (
        <NextRow color={color} onColor={onColor} title={next.title} onPress={next.onPress} spoken={next.accessibilityLabel} />
      ) : null}
    </View>
  );
}

// La suite : pastille ronde à la couleur de l'univers (triangle sombre),
// titre et chevron ; toute la ligne se touche
function NextRow({ color, onColor, title, onPress, spoken }: { color: string; onColor: string; title: string; onPress: () => void; spoken?: string }) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={spoken ?? title}
      style={({ pressed }) => [styles.nextRow, styles.nextTouch, pressed && { opacity: 0.7 }]}
    >
      <View style={[styles.dot, { backgroundColor: color }]}>
        <Ionicons name="play" size={12} color={onColor} style={styles.play} />
      </View>
      <AppText variant="bodyMedium" style={styles.nextTitle} numberOfLines={2}>
        {title}
      </AppText>
      <Ionicons name="chevron-forward" size={16} color={colors.subtitle} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: PAD,
    paddingLeft: PAD + universeCard.bar,
    borderRadius: universeCard.radius,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth * 2,
    overflow: 'hidden',
  },
  bar: {
    position: 'absolute',
    left: 0,
    top: universeCard.barInset,
    bottom: universeCard.barInset,
    width: universeCard.bar,
    borderTopRightRadius: universeCard.bar,
    borderBottomRightRadius: universeCard.bar,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 24,
  },
  label: {
    fontFamily: fonts.bodyExtraBold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.2,
  },
  title: {
    fontFamily: fonts.title,
    fontSize: TITLE_SIZE,
    lineHeight: 26,
    letterSpacing: titleLetterSpacing(TITLE_SIZE),
    marginTop: space[1],
  },
  progress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2] + 2,
    marginTop: space[3],
  },
  track: {
    flex: 1,
    height: BAR,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.pill,
  },
  count: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    lineHeight: 18,
    fontVariant: ['tabular-nums'],
  },
  finished: {
    gap: space[1],
  },
  empty: {
    marginTop: space[2],
  },
  nextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2] + 2,
    marginTop: space[3],
  },
  nextTouch: {
    minHeight: 44,
    marginTop: space[2],
  },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  play: {
    marginLeft: 2,
  },
  nextTitle: {
    flex: 1,
    fontFamily: fonts.bodySemibold,
    fontSize: 15,
    lineHeight: 20,
  },
});
