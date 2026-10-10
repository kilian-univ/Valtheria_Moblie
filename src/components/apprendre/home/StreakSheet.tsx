import { StyleSheet, View } from 'react-native';

import AppText from '@/src/components/common/AppText';
import BottomSheet from '@/src/components/common/BottomSheet';
import Button from '@/src/components/common/Button';
import StreakFlame from '@/src/components/common/StreakFlame';
import { space } from '@/src/constants/style/Style';
import { formatInteger } from '@/src/utils/format';

// Seul emoji autorisé de l'app (validé) : la flamme de la série
const FLAME_SIZE = 64;
// Lueur derrière la flamme : 1,5 fois sa taille, jamais plus
const GLOW_SIZE = FLAME_SIZE * 1.5;
const NBSP = ' ';

type StreakSheetProps = {
  streak: number;
  open: boolean;
  onRequestClose: () => void;
  onClosed: () => void;
  // Absent s'il n'y a aucune leçon à suivre (tout est terminé)
  onContinue?: () => void;
  continueDisabled: boolean;
  continueDisabledReason?: string;
};

// Feuille de la série. Pas de calendrier : l'API ne fournit pas l'historique.
export default function StreakSheet({
  streak,
  open,
  onRequestClose,
  onClosed,
  onContinue,
  continueDisabled,
  continueDisabledReason,
}: StreakSheetProps) {
  const days = `${formatInteger(streak)}${NBSP}${streak > 1 ? 'jours' : 'jour'}`;
  const message =
    streak > 0
      ? `Ta série en cours. Fais une leçon demain pour passer à ${formatInteger(streak + 1)}.`
      : "Fais une leçon aujourd'hui pour démarrer ta série.";

  return (
    <BottomSheet open={open} onRequestClose={onRequestClose} onClosed={onClosed}>
      <View style={styles.content}>
        <View style={styles.flameWrap} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <StreakFlame days={streak} size={FLAME_SIZE / 0.8} />
        </View>
        <AppText variant="hero" accessibilityRole="header" accessibilityLabel={`Série de ${days}`}>
          {days}
        </AppText>
        <AppText variant="body" tone="subtitle" style={styles.center}>
          {message}
        </AppText>
        <AppText variant="caption" tone="subtitle" style={styles.center}>
          Une leçon par jour suffit pour garder ta série.
        </AppText>
      </View>

      {onContinue ? (
        <Button
          label={streak > 0 ? 'Continuer ma série' : 'Commencer ma série'}
          onPress={onContinue}
          disabled={continueDisabled}
          disabledReason={continueDisabledReason}
          style={styles.button}
        />
      ) : null}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    marginTop: space[6],
    alignItems: 'center',
    gap: space[2],
  },
  flameWrap: {
    width: GLOW_SIZE,
    height: GLOW_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    textAlign: 'center',
  },
  button: {
    marginTop: space[6],
  },
});
