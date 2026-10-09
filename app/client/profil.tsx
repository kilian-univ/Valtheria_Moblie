import { OpaqueScreen } from '@/src/components/common/AppBackground';
import ProfileScreen from '@/src/screens/header/ProfilScreen';

// Page poussée sur une pile : opaque, avec sa copie du fond commun
export default function Profil() {
  return (
    <OpaqueScreen tab="client">
      <ProfileScreen />
    </OpaqueScreen>
  );
}
