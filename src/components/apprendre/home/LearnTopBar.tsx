import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import ProfileAvatar from '@/src/components/profile/ProfileAvatar';
import Skeleton from '@/src/components/common/Skeleton';
import { LOGO, LOGO_RATIO } from '@/src/constants/brand';
import { space } from '@/src/constants/style/Style';
import { tap } from '@/src/utils/haptics';
import { initialOf, levelA11y, levelInfo } from '@/src/utils/profile';
import StatPills, { StatPillsSkeleton } from './StatPills';

const LOGO_HEIGHT = 26;
const AVATAR = 44;
const AVATAR_RING = 3;
const AVATAR_INSET = 5;

type LearnTopBarProps = {
  pseudo: string | undefined;
  // Chiffres pas encore chargés : pastilles en squelette
  stats: { xp: number; streak: number; vals: number } | null;
  ignite?: boolean | null;
  onStreak: () => void;
  onProfile: () => void;
};

// En-tête de l'accueil connecté : le logo à gauche ; à droite la série, les
// Vals et la photo de profil (initiale en attendant) dans un anneau doré qui
// montre la progression vers le niveau suivant
export default function LearnTopBar({ pseudo, stats, ignite = false, onStreak, onProfile }: LearnTopBarProps) {
  const level = levelInfo(stats?.xp ?? 0);
  return (
    <View style={styles.row}>
      <Image
        source={LOGO}
        contentFit="contain"
        style={styles.logo}
        accessible
        accessibilityRole="header"
        accessibilityLabel="Valtheria"
      />
      <View style={styles.right}>
        {stats ? (
          <StatPills streak={stats.streak} vals={stats.vals} onStreak={onStreak} ignite={ignite} />
        ) : (
          <StatPillsSkeleton />
        )}
        {stats ? (
          <Pressable
            onPress={() => {
              tap();
              onProfile();
            }}
            accessibilityRole="button"
            accessibilityLabel={`Mon profil. ${levelA11y(level)}`}
            hitSlop={4}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <ProfileAvatar
              size={AVATAR}
              initial={initialOf(pseudo)}
              ratio={level.ratio}
              ring={AVATAR_RING}
              inset={AVATAR_INSET}
              accessibilityLabel={levelA11y(level)}
            />
          </Pressable>
        ) : (
          <Skeleton width={AVATAR} height={AVATAR} shape="circle" />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space[2],
  },
  logo: {
    height: LOGO_HEIGHT,
    width: LOGO_HEIGHT * LOGO_RATIO,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
  },
  pressed: {
    opacity: 0.8,
  },
});
