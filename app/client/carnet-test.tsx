import { OpaqueScreen } from '@/src/components/common/AppBackground';
import NotebookQuizScreen from '@/src/screens/notebook/NotebookQuizScreen';

// Test « Me tester sur mes déclics », dans le lecteur des leçons
export default function CarnetTest() {
  return (
    <OpaqueScreen tab="client">
      <NotebookQuizScreen />
    </OpaqueScreen>
  );
}
