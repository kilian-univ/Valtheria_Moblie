import { OpaqueScreen } from '@/src/components/common/AppBackground';
import ArticleDetailScreen from '@/src/screens/ArticleDetailScreen';

// Page poussée sur une pile : opaque, avec sa copie du fond commun
export default function ArticleRoute() {
  return (
    <OpaqueScreen tab="article">
      <ArticleDetailScreen />
    </OpaqueScreen>
  );
}
