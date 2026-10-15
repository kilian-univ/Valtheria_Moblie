import { useRouter } from 'expo-router';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OpaqueScreen } from '@/src/components/common/AppBackground';
import PageState from '@/src/components/common/PageState';
import { space } from '@/src/constants/style/Style';

// Page introuvable : Val, et un bouton vers l'accueil. Remplace l'écran de
// secours d'Expo Router, jamais montré dans l'app.
export default function NotFound() {
  const router = useRouter();
  return (
    <OpaqueScreen tab="apprendre">
      <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
        <PageState
          variant="empty"
          mood="preoccupe"
          title="Cette page n’existe pas"
          text="Je ne la trouve nulle part. Revenons à l’accueil."
          actionLabel="Retour à l’accueil"
          onAction={() => router.replace('/apprendre')}
        />
      </SafeAreaView>
    </OpaqueScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: space[5],
  },
});
