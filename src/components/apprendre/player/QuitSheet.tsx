import { StyleSheet, View } from 'react-native';

import AppText from '@/src/components/common/AppText';
import BottomSheet from '@/src/components/common/BottomSheet';
import Button from '@/src/components/common/Button';
import SoundToggle from '@/src/components/common/SoundToggle';
import { ValAvatar } from '@/src/components/common/ValBubble';
import { space } from '@/src/constants/style/Style';
import { VAL_DIAMETER } from './ScreenIntro';

type QuitSheetProps = {
  open: boolean;
  // Fermer la feuille = continuer la leçon
  onStay: () => void;
  onQuit: () => void;
  onClosed: () => void;
};

export default function QuitSheet({ open, onStay, onQuit, onClosed }: QuitSheetProps) {
  return (
    <BottomSheet open={open} onRequestClose={onStay} onClosed={onClosed}>
      <View style={styles.content}>
        <ValAvatar mood="preoccupe" diameter={VAL_DIAMETER} />
        <View style={styles.texts}>
          <AppText variant="title2" accessibilityRole="header" style={styles.center}>
            Quitter la leçon ?
          </AppText>
          <AppText variant="body" tone="subtitle" style={styles.center}>
            Tu y étais presque. Si tu pars maintenant, tu devras la recommencer depuis le début.
          </AppText>
        </View>
        <View style={styles.actions}>
          <Button label="Continuer la leçon" onPress={onStay} />
          <Button label="Quitter" variant="textDanger" onPress={onQuit} />
        </View>
        {/* Réglage accessible à tous, même sans compte */}
        <SoundToggle style={styles.sound} />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    gap: space[4],
    paddingTop: space[6],
  },
  texts: {
    gap: space[2],
  },
  center: {
    textAlign: 'center',
  },
  sound: {
    alignSelf: 'stretch',
  },
  actions: {
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: space[2],
  },
});
