import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AppText from '@/src/components/common/AppText';
import BackButton from '@/src/components/common/BackButton';
import LoadErrorState from '@/src/components/common/LoadErrorState';
import PageState from '@/src/components/common/PageState';
import { PortfolioSkeleton } from '@/src/components/common/ScreenSkeletons';
import { fonts, space, titleLetterSpacing } from '@/src/constants/style/Style';
import type { BudgetView } from '@/src/hooks/useBudgetView';
import type { LoadError } from '@/src/utils/loadError';

// Écran du budget sans données à montrer : chargement, sans compte ou erreur,
// toujours avec le retour et le titre de la page
export default function BudgetStateScreen({ view, title, errorKind, onRetry }: { view: Exclude<BudgetView, 'ready'>; title: string; errorKind: LoadError; onRetry: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.bar}>
        <BackButton onBack={() => router.back()} />
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space[8] }]}>
        <AppText accessibilityRole="header" style={styles.title}>
          {title}
        </AppText>
        {view === 'loading' ? <PortfolioSkeleton /> : null}
        {view === 'guest' ? (
          <PageState
            variant="empty"
            mood="complice"
            text="Ton budget, c’est un chiffre à tenir à jour, et tu sais toujours ce que tu peux dépenser. Crée ton compte pour commencer, c’est gratuit."
            actionLabel="Créer mon compte"
            onAction={() => router.push('/client/register')}
          />
        ) : null}
        {view === 'error' ? <LoadErrorState title="Budget indisponible" what="ton budget" kind={errorKind} onRetry={onRetry} /> : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  bar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space[4], minHeight: 52 },
  content: { paddingHorizontal: space[5], gap: space[4] },
  title: { fontFamily: fonts.title, fontSize: 26, lineHeight: 32, letterSpacing: titleLetterSpacing(26) },
});
