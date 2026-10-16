import { router } from 'expo-router';
import { View } from 'react-native';

import { OpaqueScreen } from '@/src/components/common/AppBackground';
import BackButton from '@/src/components/common/BackButton';
import PageState from '@/src/components/common/PageState';

// Noter une opération : écran du lot 2 (en attendant, un retour simple)
export default function Operation() {
  return (
    <OpaqueScreen tab="outils">
      <View style={{ flex: 1, paddingTop: 60, paddingHorizontal: 16 }}>
        <BackButton onBack={() => router.back()} />
        <PageState variant="empty" mood="complice" text="Noter une opération arrive très bientôt." />
      </View>
    </OpaqueScreen>
  );
}
