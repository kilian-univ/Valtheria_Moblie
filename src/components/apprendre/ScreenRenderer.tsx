import FallbackScreen from './screens/FallbackScreen';
import FilTempsScreen from './screens/FilTempsScreen';
import ScenarioScreen from './screens/ScenarioScreen';
import SentenceBuildScreen from './screens/SentenceBuildScreen';
import SimpleChoiceScreen from './screens/SimpleChoiceScreen';
import SummaryScreen from './screens/SummaryScreen';
import SwipeSortScreen from './screens/SwipeSortScreen';
import TenteScreen from './screens/TenteScreen';
import { LessonScreenProps } from './types';

// Dispatch principal par type d'écran — ajouter un nouveau type ici
export default function ScreenRenderer(props: LessonScreenProps) {
  switch (props.screen.type) {
    case 'hook':
    case 'application_personnelle':
      return <SimpleChoiceScreen {...props} />;
    case 'scenario':
      return <ScenarioScreen {...props} />;
    case 'tente':
      return <TenteScreen {...props} />;
    case 'fil_temps':
      return <FilTempsScreen {...props} />;
    case 'swipe_sort':
      return <SwipeSortScreen {...props} />;
    case 'sentence_build':
      return <SentenceBuildScreen {...props} />;
    case 'summary':
      return <SummaryScreen {...props} />;
    default:
      return <FallbackScreen {...props} />;
  }
}