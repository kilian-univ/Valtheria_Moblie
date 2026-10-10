import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import AppText from '@/src/components/common/AppText';
import { palette, radius, size, space } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';

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
      {onApple ? (
        <Pressable
          onPress={onApple}
          accessibilityRole="button"
          style={({ pressed }) => [styles.button, { backgroundColor: colors.text, opacity: pressed ? 0.85 : 1 }]}
        >
          <Ionicons name="logo-apple" size={20} color={colors.background} />
          <AppText variant="button" tone="background">
            Continuer avec Apple
          </AppText>
        </Pressable>
      ) : null}
      {onGoogle ? (
        <Pressable
          onPress={onGoogle}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.button,
            { borderWidth: 1, borderColor: colors.controlBorder, backgroundColor: pressed ? colors.surface2 : 'transparent' },
          ]}
        >
          <Ionicons name="logo-google" size={20} color={colors.text} />
          <AppText variant="button">Continuer avec Google</AppText>
        </Pressable>
      ) : null}
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
  button: {
    minHeight: size.buttonHeight,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[3] - 2,
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
