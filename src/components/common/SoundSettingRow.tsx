import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { StyleProp, Switch, TextStyle, View, ViewStyle } from 'react-native';

import AppText from '@/src/components/common/AppText';
import { palette } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { soundSettings, useSoundEnabled } from '@/src/state/soundSettings';
import { select } from '@/src/utils/haptics';

type SoundSettingRowProps = {
  // Styles de ligne du profil (row, rowLeft, rowLabel)
  rowStyle: StyleProp<ViewStyle>;
  leftStyle: StyleProp<ViewStyle>;
  labelStyle: StyleProp<TextStyle>;
};

// Réglage du profil : les sons des leçons, activés par défaut. Mémorisé sur
// le téléphone (state/soundSettings.ts) : il vaut aussi sans compte.
export default function SoundSettingRow({ rowStyle, leftStyle, labelStyle }: SoundSettingRowProps) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const enabled = useSoundEnabled();

  useEffect(() => {
    soundSettings.load();
  }, []);

  const toggle = (next: boolean) => {
    select();
    soundSettings.set(next);
  };

  return (
    <View style={rowStyle}>
      <View style={leftStyle}>
        <Ionicons name={enabled ? 'volume-medium-outline' : 'volume-mute-outline'} size={18} color={colors.subtitle} />
        <AppText style={labelStyle}>Sons</AppText>
      </View>
      <Switch
        value={enabled}
        onValueChange={toggle}
        trackColor={{ false: colors.surface2, true: colors.gold }}
        thumbColor={colors.ivory}
        ios_backgroundColor={colors.surface2}
        accessibilityLabel="Sons des leçons"
        accessibilityHint={enabled ? 'Touche pour couper les sons' : 'Touche pour activer les sons'}
      />
    </View>
  );
}
