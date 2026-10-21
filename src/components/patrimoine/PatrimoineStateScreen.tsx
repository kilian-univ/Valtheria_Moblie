import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AppText from '@/src/components/common/AppText';
import BackButton from '@/src/components/common/BackButton';
import LoadErrorState from '@/src/components/common/LoadErrorState';
import PageState from '@/src/components/common/PageState';
import { PortfolioSkeleton } from '@/src/components/common/ScreenSkeletons';
import { fonts, space, titleLetterSpacing } from '@/src/constants/style/Style';
import type { PatrimoineView } from '@/src/hooks/usePatrimoineView';
import type { LoadError } from '@/src/utils/loadError';

type Props = {
  view: Exclude<PatrimoineView, 'ready'>;
  // Titre de la page (« Mon patrimoine », « Analyse ») ; absent pour Un actif
  title?: string;
  errorKind: LoadError;
  onRetry: () => void;
  // Nouvelle tentative en cours : l'erreur reste affichée, sans squelette
  retrying?: boolean;
};

// Écran du patrimoine sans données à montrer : chargement, sans compte ou
// erreur, toujours avec le retour et le titre de la page
export default function PatrimoineStateScreen({ view, title, errorKind, onRetry, retrying = false }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.bar}>
        <BackButton onBack={() => router.back()} />
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space[8] }]}>
        {title ? (
          <AppText accessibilityRole="header" style={styles.title}>
            {title}
          </AppText>
        ) : null}
        {view === 'loading' ? <PortfolioSkeleton /> : null}
        {view === 'guest' ? <GuestState /> : null}
        {view === 'error' ? (
          <LoadErrorState title="Patrimoine indisponible" what="ton patrimoine" kind={errorKind} onRetry={onRetry} retrying={retrying} />
        ) : null}
      </ScrollView>
    </View>
  );
}

function GuestState() {
  return (
    <PageState
      variant="empty"
      mood="complice"
      text="Suivre ton patrimoine, c’est voir où va ton argent. Crée ton compte pour commencer, c’est gratuit."
      actionLabel="Créer mon compte"
      onAction={() => router.push('/client/register')}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  bar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space[4], minHeight: 52 },
  content: { paddingHorizontal: space[4], gap: space[3] },
  title: { fontFamily: fonts.title, fontSize: 26, lineHeight: 32, letterSpacing: titleLetterSpacing(26) },
});
