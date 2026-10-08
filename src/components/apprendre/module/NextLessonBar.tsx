import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import AppText from '@/src/components/common/AppText';
import Button from '@/src/components/common/Button';
import { palette, space } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';

const FADE_HEIGHT = 28;

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

// Bouton fixé en bas de la page module, au-dessus de la barre d'onglets.
// Un fondu vers le fond le précède : le chemin passe dessous.
export default function NextLessonBar({
  label,
  onPress,
  loading,
  disabled,
  disabledReason,
  error,
  onHeight,
}: NextLessonBarProps) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];

  return (
    <View
      style={styles.bar}
      pointerEvents="box-none"
      onLayout={(e) => onHeight(e.nativeEvent.layout.height)}
    >
      <LinearGradient
        pointerEvents="none"
        colors={['transparent', colors.background]}
        style={styles.fade}
      />
      <View style={[styles.panel, { backgroundColor: colors.background }]}>
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
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  fade: {
    height: FADE_HEIGHT,
  },
  panel: {
    paddingHorizontal: space[5],
    paddingBottom: space[4],
  },
  error: {
    textAlign: 'center',
    marginBottom: space[2],
  },
});
