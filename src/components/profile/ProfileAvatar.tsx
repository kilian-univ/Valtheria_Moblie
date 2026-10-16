import { StyleSheet, View } from 'react-native';

import AppText from '@/src/components/common/AppText';
import ProgressRing from '@/src/components/common/ProgressRing';
import { fonts, palette } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';

// Anneau autour de la photo : écart et épaisseur
const RING = 4;
const INSET = 8;

type ProfileAvatarProps = {
  // 76 (profil) ou 64 (réglages)
  size: number;
  initial: string;
  // Progression vers le niveau suivant, de 0 à 1
  ratio: number;
  // « Niveau 10, encore 225 XP avant le niveau 11 »
  accessibilityLabel: string;
};

// Photo de profil ronde dans un anneau doré qui montre la progression vers
// le niveau suivant. Sans photo (le serveur ne l'envoie pas encore à l'app) :
// l'initiale sur un fond doux. L'anneau se remplit à l'apparition.
export default function ProfileAvatar({ size, initial, ratio, accessibilityLabel }: ProfileAvatarProps) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const inner = size - 2 * INSET;
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={accessibilityLabel}>
      <ProgressRing progress={ratio} diameter={size} stroke={RING} animated>
        <View
          style={[styles.photo, { width: inner, height: inner, borderRadius: inner / 2, backgroundColor: colors.goldSoft }]}
        >
          <AppText
            maxFontSizeMultiplier={1}
            style={[styles.initial, { color: colors.gold, fontSize: inner * 0.46, lineHeight: inner * 0.6 }]}
          >
            {initial}
          </AppText>
        </View>
      </ProgressRing>
    </View>
  );
}

const styles = StyleSheet.create({
  photo: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    fontFamily: fonts.title,
  },
});
