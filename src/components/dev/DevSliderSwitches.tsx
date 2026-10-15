import { StyleSheet, Switch, View } from 'react-native';

import AppText from '@/src/components/common/AppText';
import { palette, space } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { type DevFlags, devFlags, useDevFlags } from '@/src/state/devFlags';

const SWITCHES: { key: keyof DevFlags; label: string }[] = [
  { key: 'noHaptics', label: 'Sans vibrations' },
  { key: 'noSounds', label: 'Sans sons' },
  { key: 'noLiveUpdates', label: 'Sans mises à jour de l’écran pendant le glissement' },
];

// Développement seulement (affiché sous __DEV__) : diagnostic de la fluidité
// des curseurs. Mémoire de la session, rien n'est enregistré.
export default function DevSliderSwitches() {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const flags = useDevFlags();
  return (
    <View style={styles.wrap}>
      <AppText variant="sectionLabel" tone="subtitle">
        Diagnostic des curseurs (développement)
      </AppText>
      {SWITCHES.map((s) => (
        <View key={s.key} style={styles.row}>
          <AppText variant="callout" style={styles.label}>
            {s.label}
          </AppText>
          <Switch
            value={flags[s.key]}
            onValueChange={(on) => devFlags.set({ [s.key]: on })}
            trackColor={{ false: colors.surface2, true: colors.gold }}
            thumbColor={colors.ivory}
            ios_backgroundColor={colors.surface2}
            accessibilityLabel={s.label}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: space[2],
    alignSelf: 'stretch',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    minHeight: 44,
  },
  label: {
    flex: 1,
  },
});
