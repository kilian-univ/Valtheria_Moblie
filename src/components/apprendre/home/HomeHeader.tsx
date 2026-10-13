import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import AppText from '@/src/components/common/AppText';
import Skeleton from '@/src/components/common/Skeleton';
import { LOGO, LOGO_RATIO } from '@/src/constants/brand';
import { fonts, palette, space } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { formatInteger } from '@/src/utils/format';
import StatPills, { PILL_HEIGHT, StatPillsSkeleton } from './StatPills';
import IconButton from '@/src/components/common/IconButton';

const LOGO_HEIGHT = 26;
// Bloc à la place du pseudo pas encore connu (titre de 30 / 36)
const NAME_SKELETON_WIDTH = 120;
const NAME_SKELETON_HEIGHT = 28;
const PERSON_ICON_SIZE = 18;
const INITIAL_SIZE = 16;
const LEVEL_TEXT = { fontFamily: fonts.bodySemibold, fontSize: 14, lineHeight: 20 } as const;
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
  // Titre imposé (accueil sans compte : « Bonsoir, <prénom> »)
  title?: string;
  // Phrase sous le titre (accueil sans compte)
  subtitle?: string;
  // Allumage de la flamme de série (première apparition du jour)
  ignite?: boolean | null;
};

export default function HomeHeader({
  pseudo,
  pseudoPending = false,
  stats,
  statsLoading = false,
  onStreak,
  onAccount,
  title,
  subtitle,
  ignite = false,
}: HomeHeaderProps) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const initial = pseudo?.trim().charAt(0).toUpperCase();
  const hello = title ?? (pseudo ? `${greeting()}, ${pseudo}` : greeting());

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
            <StatPills streak={stats.streak} vals={stats.vals} onStreak={onStreak} ignite={ignite} />
          ) : statsLoading ? (
            <StatPillsSkeleton />
          ) : null}

          <IconButton
            variant="filled"
            size={PILL_HEIGHT}
            hitSlop={4}
            icon="person-outline"
            iconSize={PERSON_ICON_SIZE}
            color={colors.gold}
            onPress={onAccount}
            accessibilityLabel={stats || statsLoading ? 'Mon compte' : 'Se connecter'}
          >
            {initial ? (
              <Text maxFontSizeMultiplier={1.2} style={[styles.initial, { color: colors.gold }]}>
                {initial}
              </Text>
            ) : undefined}
          </IconButton>
        </View>
      </View>

      <View style={styles.greeting}>
        {pseudoPending && !pseudo && !title ? (
          <View style={styles.helloRow} accessible accessibilityRole="header" accessibilityLabel={greeting()}>
            <AppText variant="title1">{`${greeting()},`}</AppText>
            <Skeleton width={NAME_SKELETON_WIDTH} height={NAME_SKELETON_HEIGHT} />
          </View>
        ) : (
          <AppText variant="title1" accessibilityRole="header">
            {hello}
          </AppText>
        )}
        {subtitle ? (
          <AppText variant="callout" tone="subtitle">
            {subtitle}
          </AppText>
        ) : null}
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
