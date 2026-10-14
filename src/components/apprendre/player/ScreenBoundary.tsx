import { Component, ErrorInfo, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import AppText from '@/src/components/common/AppText';
import Button from '@/src/components/common/Button';
import { ValAvatar } from '@/src/components/common/ValBubble';
import { space } from '@/src/constants/style/Style';

type Props = {
  children: ReactNode;
  // Passer l'écran qui a planté (la leçon continue)
  onSkip: () => void;
};

type State = { failed: boolean };

const VAL_SIZE = 72;

// Filet de sécurité d'un écran du lecteur : un écran qui plante ne fait
// jamais tomber la leçon. On propose de passer à la suite ; l'erreur
// complète part dans le terminal d'Expo (ligne « ERREUR ÉCRAN DE LEÇON »).
// Remonté avec l'écran (key du lecteur) : l'écran suivant repart à neuf.
export default class ScreenBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ERREUR ÉCRAN DE LEÇON :', error?.message, '\n', error?.stack, '\nComposants :', info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <View style={styles.wrap} accessibilityLiveRegion="polite">
        <ValAvatar mood="preoccupe" diameter={VAL_SIZE} />
        <AppText variant="title3" accessibilityRole="header" style={styles.center}>
          Cet écran a un souci
        </AppText>
        <AppText variant="body" tone="subtitle" style={styles.center}>
          Ce n’est pas toi. Passe à la suite, la leçon continue.
        </AppText>
        <Button label="Passer cet écran" onPress={this.props.onSkip} />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[3],
  },
  center: {
    textAlign: 'center',
  },
});
