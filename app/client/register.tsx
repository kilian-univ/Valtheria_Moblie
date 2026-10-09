import { OpaqueScreen } from '@/src/components/common/AppBackground';
import RegisterScreen from '@/src/screens/header/RegisterScreen';

// Page poussée sur une pile : opaque, avec sa copie du fond commun
export default function Register() {
  return (
    <OpaqueScreen tab="client">
      <RegisterScreen />
    </OpaqueScreen>
  );
}
