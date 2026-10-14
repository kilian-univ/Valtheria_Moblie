import { Ionicons } from '@expo/vector-icons';
import { StyleProp, TextStyle, View, ViewStyle } from 'react-native';

import AppText from '@/src/components/common/AppText';
import { palette } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { SoundSwitch, useSoundToggle } from './SoundToggle';

type SoundSettingRowProps = {
  // Styles de ligne du profil (row, rowLeft, rowLabel)
  rowStyle: StyleProp<ViewStyle>;
  leftStyle: StyleProp<ViewStyle>;
  labelStyle: StyleProp<TextStyle>;
};

// Réglage du profil : les sons des leçons, activés par défaut. Même mémoire
// que la feuille « Quitter la leçon ? » et l'écran de connexion.
export default function SoundSettingRow({ rowStyle, leftStyle, labelStyle }: SoundSettingRowProps) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const { enabled, toggle } = useSoundToggle();

  return (
    <View style={rowStyle}>
      <View style={leftStyle}>
        <Ionicons name={enabled ? 'volume-medium-outline' : 'volume-mute-outline'} size={18} color={colors.subtitle} />
        <AppText style={labelStyle}>Sons</AppText>
      </View>
      <SoundSwitch enabled={enabled} onChange={toggle} />
    </View>
  );
}
