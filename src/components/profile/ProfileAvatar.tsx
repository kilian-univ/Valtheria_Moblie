import { StyleSheet, View } from 'react-native';

import AppText from '@/src/components/common/AppText';
import IconButton from '@/src/components/common/IconButton';
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
  // « Niveau 10, encore 25 XP avant le niveau 11 »
  accessibilityLabel: string;
  // Petit bouton appareil photo : seulement si l'envoi d'une photo est
  // possible (pas de route serveur pour l'instant, docs/lot-serveur.md)
  onCamera?: () => void;
  // Épaisseur de l'anneau et écart jusqu'à la photo (4 et 8 par défaut ;
  // en-tête de l'accueil : 3 et 5)
  ring?: number;
  inset?: number;
};

// Photo de profil ronde dans un anneau doré qui montre la progression vers
// le niveau suivant. Sans photo (le serveur ne l'envoie pas encore à l'app) :
// l'initiale sur un fond doux. L'anneau se remplit à l'apparition.
export default function ProfileAvatar({ size, initial, ratio, accessibilityLabel, onCamera, ring = RING, inset = INSET }: ProfileAvatarProps) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const inner = size - 2 * inset;
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={accessibilityLabel}>
      <ProgressRing progress={ratio} diameter={size} stroke={ring} animated>
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
      {onCamera ? (
        <IconButton
          icon="camera"
          iconSize={14}
          variant="plain"
          color={colors.onGold}
          onPress={onCamera}
          accessibilityLabel="Changer ma photo"
          size={30}
          hitSlop={7}
          style={[styles.camera, { backgroundColor: colors.gold, borderColor: colors.background }]}
        />
      ) : null}
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
  camera: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    borderWidth: 3,
  },
});
