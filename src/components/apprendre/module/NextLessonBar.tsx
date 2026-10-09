import { StyleSheet, View } from 'react-native';

import AppText from '@/src/components/common/AppText';
import Button from '@/src/components/common/Button';
import { space } from '@/src/constants/style/Style';


type NextLessonBarProps = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  disabledReason?: string;
  error?: string | null;
  // Hauteur totale (fondu compris) : la page réserve cette place en bas
  onHeight: (height: number) => void;
};

// Bouton en bas de la page module, au-dessus de la barre d'onglets. Il est
// dans le flux, sous le contenu qui défile : rien ne passe dessous, pas
// besoin d'aplat (le fond commun se voit derrière).
export default function NextLessonBar({
  label,
  onPress,
  loading,
  disabled,
  disabledReason,
  error,
  onHeight,
}: NextLessonBarProps) {
  return (
    <View
      style={styles.panelWrap}
      pointerEvents="box-none"
      onLayout={(e) => onHeight(e.nativeEvent.layout.height)}
    >
      <View style={styles.panel}>
        {error ? (
          <AppText variant="callout" tone="error" style={styles.error} accessibilityLiveRegion="polite">
            {error}
          </AppText>
        ) : null}
        <Button
          label={label}
          onPress={onPress}
          loading={loading}
          disabled={disabled}
          disabledReason={disabledReason}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    paddingTop: space[3],
    paddingHorizontal: space[5],
    paddingBottom: space[4],
  },
  panelWrap: {},
  error: {
    textAlign: 'center',
    marginBottom: space[2],
  },
});
