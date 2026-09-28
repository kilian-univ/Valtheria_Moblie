import ChoiceScreen from './screens/ChoiceScreen';
import DocumentScreen from './screens/DocumentScreen';
import FallbackScreen from './screens/FallbackScreen';
import RevealScreen from './screens/RevealScreen';
import { LessonScreenProps } from './types';

// Dispatch par type d'écran. Types encore non implémentés (uncover, hunch,
// myth, versus, spot, swipe, match, fill, decide, compare) tombent sur
// FallbackScreen — lisible, non bloquant, en attendant un exemple JSON réel.
export default function ScreenRenderer(props: LessonScreenProps) {
  switch (props.screen.type) {
    case 'reveal':
      return <RevealScreen {...props} />;
    case 'choice':
      return <ChoiceScreen {...props} />;
    case 'document':
      return <DocumentScreen {...props} />;
    default:
      return <FallbackScreen {...props} />;
  }
}