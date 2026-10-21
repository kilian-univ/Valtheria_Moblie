import { StyleProp, ViewStyle } from 'react-native';

import { loadErrorText, type LoadError } from '@/src/utils/loadError';
import PageState from './PageState';

type Props = {
  // « Patrimoine indisponible »
  title: string;
  // « ton patrimoine » : complète « Impossible de charger … »
  what: string;
  kind: LoadError;
  onRetry: () => void;
  // Nouvelle tentative en cours (« Nouvelle tentative… »)
  retrying?: boolean;
  style?: StyleProp<ViewStyle>;
};

// Chargement en échec, sans données à montrer : jamais d'état vide qui
// ment (« Aucun article »), toujours la cause et « Réessayer »
export default function LoadErrorState({ title, what, kind, onRetry, retrying, style }: Props) {
  return <PageState variant="error" title={title} message={loadErrorText(kind, what)} onRetry={onRetry} retrying={retrying} style={style} />;
}
