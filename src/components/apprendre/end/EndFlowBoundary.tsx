import { Component, ErrorInfo, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppText from '@/src/components/common/AppText';
import Button from '@/src/components/common/Button';
import { ValAvatar } from '@/src/components/common/ValBubble';
import { space } from '@/src/constants/style/Style';

type Props = {
  children: ReactNode;
  // Dernier bouton : retour là d'où l'on vient
  onDone: () => void;
};

type State = { failed: boolean };

// Filet de sécurité de la cérémonie de fin : la leçon est déjà enregistrée,
// un écran de fin qui plante ne doit jamais mener à la page d'erreur. On
// affiche un écran de fin simple, et l'erreur complète part dans le terminal
// d'Expo (ligne « ERREUR FIN DE LEÇON »).
export default class EndFlowBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ERREUR FIN DE LEÇON :', error?.message, '\n', error?.stack, '\nComposants :', info.componentStack);
  }

  render() {
    if (this.state.failed) return <EndFallback onDone={this.props.onDone} />;
    return this.props.children;
  }
}

const VAL_SIZE = 90;

function EndFallback({ onDone }: { onDone: () => void }) {
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.center}>
        <ValAvatar mood="celebrant" diameter={VAL_SIZE} />
        <AppText variant="title1" accessibilityRole="header" style={styles.text}>
          Leçon terminée !
        </AppText>
        <AppText variant="body" tone="subtitle" style={styles.text}>
          Ta leçon est bien enregistrée.
        </AppText>
      </View>
      <View style={styles.footer}>
        <Button label="Continuer" onPress={onDone} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[4],
    paddingHorizontal: space[5],
  },
  text: {
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: space[5],
    paddingBottom: space[4],
  },
});
