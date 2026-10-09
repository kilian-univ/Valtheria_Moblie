import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';

import { palette, size, space } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';

const BACK_SIZE = 26;

// Bouton retour de la page module (zone de 44)
export function BackButton({ onBack }: { onBack: () => void }) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  return (
    <Pressable
      onPress={onBack}
      accessibilityRole="button"
      accessibilityLabel="Retour"
      style={({ pressed }) => [styles.back, pressed && { backgroundColor: colors.surface2 }]}
    >
      <Ionicons name="chevron-back" size={BACK_SIZE} color={colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  back: {
    width: size.tapMin,
    height: size.tapMin,
    borderRadius: size.tapMin / 2,
    alignItems: 'center',
    justifyContent: 'center',
    // Aligne optiquement le chevron sur la marge de 20
    marginLeft: -space[3],
  },
});
