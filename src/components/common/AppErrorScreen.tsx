import type { ErrorBoundaryProps } from 'expo-router';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { palette, space } from '@/src/constants/style/Style';
import { ThemeProvider, useTheme } from '@/src/context/ThemeContext';
import { logError } from '@/src/state/errorLog';
import AppText from './AppText';
import Button from './Button';
import { ValAvatar } from './ValBubble';

const VAL_SIZE = 96;
export const ERROR_TITLE = 'Quelque chose s’est mal passé';
export const ERROR_TEXT = 'Ce n’est pas toi. Réessaie, ou reviens à l’accueil : tes données sont à l’abri.';
const HOME = '/apprendre';

type Props = ErrorBoundaryProps & { where: string };

// Écran de secours quand l'affichage plante : Val, un message clair,
// « Réessayer » et « Retour à l'accueil ». L'erreur part dans le journal.
// Fond opaque : une page poussée est transparente, et le fond commun vient
// d'OpaqueScreen, à l'intérieur de la page qui vient de planter.
function ErrorContent({ error, retry, where }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];

  useEffect(() => {
    logError(where, error);
  }, [error, where]);

  const goHome = () => {
    // On repart d'une pile propre ; si la navigation elle-même a planté, on
    // retente au moins l'affichage
    try {
      if (router.canDismiss()) router.dismissAll();
      router.replace(HOME);
    } catch {
      retry();
    }
  };

  return (
    <View
      style={[styles.wrap, { backgroundColor: colors.background, paddingTop: insets.top + space[6], paddingBottom: insets.bottom + space[6] }]}
      accessibilityViewIsModal
    >
      <ValAvatar mood="preoccupe" diameter={VAL_SIZE} />
      <View style={styles.texts} accessible accessibilityRole="alert">
        <AppText variant="title2" accessibilityRole="header" style={styles.center}>
          {ERROR_TITLE}
        </AppText>
        <AppText variant="body" tone="subtitle" style={styles.center}>
          {ERROR_TEXT}
        </AppText>
      </View>
      <View style={styles.actions}>
        <Button label="Réessayer" onPress={() => retry()} />
        <Button variant="secondary" label="Retour à l’accueil" onPress={goHome} />
      </View>
    </View>
  );
}

// Filet de chaque écran (unstable_settings.screenErrorBoundary du layout
// racine) : à l'intérieur des fournisseurs de l'app
export function ScreenErrorBoundary(props: ErrorBoundaryProps) {
  return <ErrorContent {...props} where="écran" />;
}

// Filet global (ErrorBoundary du layout racine) : le layout lui-même a
// planté, ses fournisseurs aussi ; l'écran apporte les siens
export function RootErrorBoundary(props: ErrorBoundaryProps) {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ErrorContent {...props} where="app" />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[4],
    paddingHorizontal: space[6],
  },
  texts: {
    alignItems: 'center',
    gap: space[2],
  },
  center: {
    textAlign: 'center',
  },
  actions: {
    alignSelf: 'stretch',
    gap: space[3],
    marginTop: space[2],
  },
});
