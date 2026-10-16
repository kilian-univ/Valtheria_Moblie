import { OpaqueScreen } from '@/src/components/common/AppBackground';
import NotebookScreen from '@/src/screens/notebook/NotebookScreen';

// Carnet de déclics, ouvert depuis le profil
export default function Carnet() {
  return (
    <OpaqueScreen tab="client">
      <NotebookScreen />
    </OpaqueScreen>
  );
}
