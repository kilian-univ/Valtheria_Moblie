import { StyleSheet } from 'react-native';

import { space } from '@/src/constants/style/Style';
import IconButton from './IconButton';

const BACK_ICON = 26;

// Bouton retour commun (zone de 44), chevron couleur du texte. Le chevron
// s'aligne optiquement sur la marge de 20.
export default function BackButton({ onBack, label = 'Retour' }: { onBack: () => void; label?: string }) {
  return <IconButton icon="chevron-back" iconSize={BACK_ICON} onPress={onBack} accessibilityLabel={label} style={styles.back} />;
}

const styles = StyleSheet.create({
  back: {
    marginLeft: -space[3],
  },
});
