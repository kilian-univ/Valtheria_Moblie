import { OpaqueScreen } from '@/src/components/common/AppBackground';
import SettingsScreen from '@/src/screens/header/SettingsScreen';

// Réglages, ouverts par la roue dentée du profil
export default function Reglages() {
  return (
    <OpaqueScreen tab="client">
      <SettingsScreen />
    </OpaqueScreen>
  );
}
