import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import AppText from '@/src/components/common/AppText';
import Skeleton from '@/src/components/common/Skeleton';
import { LOGO, LOGO_RATIO } from '@/src/constants/brand';
import { fonts, palette, radius, space } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { formatInteger } from '@/src/utils/format';

const LOGO_HEIGHT = 26;
// Bloc à la place du pseudo pas encore connu (titre de 30 / 36)
const NAME_SKELETON_WIDTH = 120;
const NAME_SKELETON_HEIGHT = 28;
const PILL_HEIGHT = 36;
const PILL_TEXT = { fontFamily: fonts.bodySemibold, fontSize: 15, lineHeight: 20 } as const;
const DIAMOND_SIZE = 18;
const INITIAL_SIZE = 16;
const LEVEL_TEXT = { fontFamily: fonts.bodySemibold, fontSize: 14, lineHeight: 20 } as const;
// Seul emoji autorisé de l'app (validé) : la flamme de la série
const FLAME = '\u{1F525}';
const NBSP = '\u00A0';

// « Bonjour » de 5 h à 18 h, « Bonsoir » sinon
export function greeting(date: Date = new Date()): string {
  const hour = date.getHours();
  return hour >= 5 && hour < 18 ? 'Bonjour' : 'Bonsoir';
}

type HomeHeaderProps = {
  pseudo?: string;
  // Pseudo encore inconnu (première connexion) : bloc de squelette à sa place
  pseudoPending?: boolean;
  // Absent pour un visiteur sans compte : ni série, ni Vals, ni niveau
  stats?: { level: number; xp: number; streak: number; vals: number };
  // Compte connecté mais chiffres pas encore chargés : pastilles en squelette
  statsLoading?: boolean;
  onStreak: () => void;
  onAccount: () => void;
};

export default function HomeHeader({
  pseudo,
  pseudoPending = false,
  stats,
  statsLoading = false,
  onStreak,
  onAccount,
}: HomeHeaderProps) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const initial = pseudo?.trim().charAt(0).toUpperCase();
  const hello = pseudo ? `${greeting()}, ${pseudo}` : greeting();

  return (
    <View style={styles.wrap}>
      <View style={styles.topRow}>
        <Image
          source={LOGO}
          contentFit="contain"
          style={styles.logo}
          accessible
          accessibilityRole="header"
          accessibilityLabel="Valtheria"
        />

        <View style={styles.pills}>
          {stats ? (
            <>
              <Pressable
                onPress={onStreak}
                accessibilityRole="button"
                accessibilityLabel={`Série de ${stats.streak} ${stats.streak > 1 ? 'jours' : 'jour'}`}
                accessibilityHint="Ouvre le détail de ta série"
                hitSlop={{ top: 4, bottom: 4 }}
                style={({ pressed }) => [
                  styles.pill,
                  { backgroundColor: pressed ? colors.surface2 : colors.surface },
                ]}
              >
                <Text maxFontSizeMultiplier={1.2} style={PILL_TEXT}>
                  {FLAME}
                </Text>
                <Text
                  maxFontSizeMultiplier={1.2}
                  style={[PILL_TEXT, { color: stats.streak > 0 ? colors.text : colors.subtitle }]}
                >
                  {formatInteger(stats.streak)}
                </Text>
              </Pressable>

              <View
                accessible
                accessibilityLabel={`${stats.vals} Vals`}
                style={[styles.pill, { backgroundColor: colors.surface }]}
              >
                <Ionicons name="diamond-outline" size={DIAMOND_SIZE} color={colors.gold} />
                <Text maxFontSizeMultiplier={1.2} style={[PILL_TEXT, { color: colors.text }]}>
                  {formatInteger(stats.vals)}
                </Text>
              </View>
            </>
          ) : statsLoading ? (
            <>
              <Skeleton width={58} height={PILL_HEIGHT} shape="pill" />
              <Skeleton width={64} height={PILL_HEIGHT} shape="pill" />
            </>
          ) : null}

          <Pressable
            onPress={onAccount}
            accessibilityRole="button"
            accessibilityLabel={stats || statsLoading ? 'Mon compte' : 'Se connecter'}
            hitSlop={4}
            style={({ pressed }) => [
              styles.avatar,
              { backgroundColor: pressed ? colors.surface2 : colors.surface },
            ]}
          >
            {initial ? (
              <Text maxFontSizeMultiplier={1.2} style={[styles.initial, { color: colors.gold }]}>
                {initial}
              </Text>
            ) : (
              <Ionicons name="person-outline" size={DIAMOND_SIZE} color={colors.gold} />
            )}
          </Pressable>
        </View>
      </View>

      <View style={styles.greeting}>
        {pseudoPending && !pseudo ? (
          <View style={styles.helloRow} accessible accessibilityRole="header" accessibilityLabel={greeting()}>
            <AppText variant="title1">{`${greeting()},`}</AppText>
            <Skeleton width={NAME_SKELETON_WIDTH} height={NAME_SKELETON_HEIGHT} />
          </View>
        ) : (
          <AppText variant="title1" accessibilityRole="header">
            {hello}
          </AppText>
        )}
        {stats ? (
          <Text style={styles.levelRow} maxFontSizeMultiplier={1.6}>
            <Text style={[LEVEL_TEXT, { color: colors.gold }]}>{`Niveau ${formatInteger(stats.level)}`}</Text>
            <AppText variant="callout" tone="subtitle">{`  ${formatInteger(stats.xp)}${NBSP}XP`}</AppText>
          </Text>
        ) : statsLoading ? (
          <Skeleton width={130} height={14} style={styles.levelSkeleton} />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: space[5],
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space[2],
  },
  logo: {
    height: LOGO_HEIGHT,
    width: LOGO_HEIGHT * LOGO_RATIO,
  },
  pills: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1],
    height: PILL_HEIGHT,
    paddingHorizontal: space[3],
    borderRadius: radius.pill,
  },
  avatar: {
    width: PILL_HEIGHT,
    height: PILL_HEIGHT,
    borderRadius: PILL_HEIGHT / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    fontFamily: fonts.title,
    fontSize: INITIAL_SIZE,
    lineHeight: 20,
  },
  greeting: {
    gap: space[1],
  },
  helloRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
  },
  levelRow: {
    flexDirection: 'row',
  },
  // Même hauteur de ligne que « Niveau X  Y XP » : rien ne bouge à l'arrivée
  levelSkeleton: {
    marginVertical: 3,
  },
});
