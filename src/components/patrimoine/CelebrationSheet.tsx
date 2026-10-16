import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import AppText from '@/src/components/common/AppText';
import BottomSheet from '@/src/components/common/BottomSheet';
import Button from '@/src/components/common/Button';
import ValBubble from '@/src/components/common/ValBubble';
import { space } from '@/src/constants/style/Style';
import { feedback } from '@/src/utils/feedback';

export type Celebration = { title: string; lines: string[] };

// Fête d'un objectif atteint ou d'une étape gagnée (jamais d'un gain)
export default function CelebrationSheet({ open, celebration, onClose, onClosed }: { open: boolean; celebration: Celebration; onClose: () => void; onClosed: () => void }) {
  useEffect(() => {
    if (open) feedback.unlock();
  }, [open]);
  return (
    <BottomSheet open={open} onRequestClose={onClose} onClosed={onClosed}>
      <View style={styles.content}>
        <ValBubble mood="celebrant" diameter={84} text={celebration.title} />
        <View style={styles.lines}>
          {celebration.lines.map((l) => (
            <AppText key={l} variant="callout" tone="subtitle" style={styles.center}>
              {l}
            </AppText>
          ))}
        </View>
        <Button label="Continuer" onPress={onClose} />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: { gap: space[4], paddingTop: space[4] },
  lines: { gap: space[1] },
  center: { textAlign: 'center' },
});
