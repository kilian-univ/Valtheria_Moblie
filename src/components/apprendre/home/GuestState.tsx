import { StyleSheet, View } from 'react-native';

import Button from '@/src/components/common/Button';
import { space } from '@/src/constants/style/Style';
import { guestLine } from '@/src/constants/valLines';
import ValGreeting from './ValGreeting';

type GuestStateProps = {
  onRegister: () => void;
  onLogin: () => void;
};

// Visiteur sans compte : les leçons demandent d'être connecté
export default function GuestState({ onRegister, onLogin }: GuestStateProps) {
  return (
    <View style={styles.stack}>
      <ValGreeting title={guestLine.title} text={guestLine.text} />
      <View style={styles.actions}>
        <Button label="Créer mon compte" onPress={onRegister} />
        <Button variant="text" label="J'ai déjà un compte" onPress={onLogin} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: space[6],
  },
  actions: {
    gap: space[2],
    alignItems: 'center',
  },
});
