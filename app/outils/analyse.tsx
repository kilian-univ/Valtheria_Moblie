import { router } from 'expo-router';
import { View } from 'react-native';

import { OpaqueScreen } from '@/src/components/common/AppBackground';
import BackButton from '@/src/components/common/BackButton';
import PageState from '@/src/components/common/PageState';

// Analyse : écran du lot 3 (en attendant, un retour simple)
export default function Analyse() {
  return (
    <OpaqueScreen tab="outils">
      <View style={{ flex: 1, paddingTop: 60, paddingHorizontal: 16 }}>
        <BackButton onBack={() => router.back()} />
        <PageState variant="empty" mood="complice" text="L’analyse de ton patrimoine arrive très bientôt." />
      </View>
    </OpaqueScreen>
  );
}
