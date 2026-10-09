import ChoiceScreen from './screens/ChoiceScreen';
import DocumentScreen from './screens/DocumentScreen';
import FallbackScreen from './screens/FallbackScreen';
import RevealScreen from './screens/RevealScreen';
import SliderScreen from './screens/SliderScreen';
import { LessonScreenProps } from './types';

// Un composant par type d'écran, sur le format interne (lesson/model.ts).
// number, dialogue, allocate, live_month et les types inconnus arrivent en
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
    case 'unsupported':
      return <FallbackScreen {...props} screen={screen} />;
  }
}
