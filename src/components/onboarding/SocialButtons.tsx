import { StyleSheet, View } from 'react-native';

import AppText from '@/src/components/common/AppText';
import { palette, space } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import Button from '@/src/components/common/Button';

// « Continuer avec Apple / Google » de la maquette. Rien n'est branché côté
// serveur : tant que ce réglage vaut false, aucun bouton n'est affiché (pas
// de bouton qui ne marche pas). Pour les brancher : passer à true et fournir
// onApple / onGoogle.
export const SOCIAL_LOGIN_ENABLED = false;

type SocialButtonsProps = {
  onApple?: () => void;
  onGoogle?: () => void;
};

export default function SocialButtons({ onApple, onGoogle }: SocialButtonsProps) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  if (!SOCIAL_LOGIN_ENABLED || (!onApple && !onGoogle)) return null;

  return (
    <View style={styles.stack}>
      {onApple ? <Button variant="contrast" icon="logo-apple" label="Continuer avec Apple" onPress={onApple} /> : null}
      {onGoogle ? <Button variant="secondary" icon="logo-google" label="Continuer avec Google" onPress={onGoogle} /> : null}
      <View style={styles.separator}>
        <View style={[styles.rule, { backgroundColor: colors.border }]} />
        <AppText variant="caption" tone="subtitle">
          ou avec ton e-mail
        </AppText>
        <View style={[styles.rule, { backgroundColor: colors.border }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: space[3],
  },
  separator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    marginTop: space[2],
  },
  rule: {
    flex: 1,
    height: 1,
  },
});
