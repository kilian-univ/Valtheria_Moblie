import AllocateScreen from './screens/AllocateScreen';
import ChoiceScreen from './screens/ChoiceScreen';
import DialogueScreen from './screens/DialogueScreen';
import DocumentScreen from './screens/DocumentScreen';
import FallbackScreen from './screens/FallbackScreen';
import MatchScreen from './screens/MatchScreen';
import OrderScreen from './screens/OrderScreen';
import RevealScreen from './screens/RevealScreen';
import SimulatorScreen from './screens/SimulatorScreen';
import SliderScreen from './screens/SliderScreen';
import TrueFalseScreen from './screens/TrueFalseScreen';
import { LessonScreenProps } from './types';

// Un composant par type d'écran, sur le format interne (lesson/model.ts).
// number, live_month, les types inconnus et les écrans mal formés arrivent en
// « unsupported » (lesson/normalize.ts) et tombent sur FallbackScreen.
export default function ScreenRenderer(props: LessonScreenProps) {
  const { screen } = props;
  switch (screen.kind) {
    case 'choice':
      return <ChoiceScreen {...props} screen={screen} />;
    case 'document':
      return <DocumentScreen {...props} screen={screen} />;
    case 'reveal':
      return <RevealScreen {...props} screen={screen} />;
    case 'slider':
      return <SliderScreen {...props} screen={screen} />;
    case 'true_false':
      return <TrueFalseScreen {...props} screen={screen} />;
    case 'order':
      return <OrderScreen {...props} screen={screen} />;
    case 'match':
      return <MatchScreen {...props} screen={screen} />;
    case 'allocate':
      return <AllocateScreen {...props} screen={screen} />;
    case 'simulator':
      return <SimulatorScreen {...props} screen={screen} />;
    case 'dialogue':
      return <DialogueScreen {...props} screen={screen} />;
    case 'unsupported':
      return <FallbackScreen {...props} screen={screen} />;
  }
}
