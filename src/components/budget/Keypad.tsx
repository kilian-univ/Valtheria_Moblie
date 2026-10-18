import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import AppText from '@/src/components/common/AppText';
import { fonts, palette, radius, space } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import type { PadKey } from '@/src/utils/budget/keypad';
import { tap } from '@/src/utils/haptics';

const KEYS: PadKey[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9', ',', '0', 'del'];
const SPOKEN: Partial<Record<PadKey, string>> = { ',': 'Virgule', del: 'Effacer' };

// Pavé numérique du budget (maquette : 3 colonnes, touches de 54) : solde,
// montant d'une dépense, d'une charge, de la paie. Une petite vibration par
// touche, sans son (rien ne doit être une corvée à l'oreille).
export default function Keypad({ onKey }: { onKey: (key: PadKey) => void }) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  return (
    <View style={styles.grid}>
      {KEYS.map((k) => (
        <Pressable
          key={k}
          onPress={() => {
            tap();
            onKey(k);
          }}
          accessibilityRole="button"
          accessibilityLabel={SPOKEN[k] ?? k}
          style={({ pressed }) => [styles.key, { backgroundColor: pressed ? colors.surface2 : colors.panelStrong }]}
        >
          {k === 'del' ? (
            <Ionicons name="backspace-outline" size={24} color={colors.text} />
          ) : (
            <AppText maxFontSizeMultiplier={1.2} style={[styles.label, { color: colors.text }]}>
              {k}
            </AppText>
          )}
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  key: {
    width: '31.5%',
    flexGrow: 1,
    height: 54,
    borderRadius: radius.option,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontFamily: fonts.bodySemibold, fontSize: 24 },
});
