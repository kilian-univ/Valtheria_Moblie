import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BackButton from '@/src/components/common/BackButton';
import AppText from '@/src/components/common/AppText';
import Button from '@/src/components/common/Button';
import TextField from '@/src/components/common/TextField';
import ValBubble from '@/src/components/common/ValBubble';
import SocialButtons from '@/src/components/onboarding/SocialButtons';
import { space } from '@/src/constants/style/Style';
import { useApi } from '@/src/context/ApiContext';
import { resetFlameIgnition } from '@/src/state/flameIgnition';
import { onboardingStore } from '@/src/state/onboarding';
import { resetReminder } from '@/src/state/reminder';
import { loginErrorText } from '@/src/utils/authErrors';
import { postAuth } from '@/src/utils/authProbe';
import { emailValid } from '@/src/utils/onboarding';

// Mot de passe oublié : POST /auth/forgot-password est prêt côté serveur
// (pull request « première ouverture ») mais pas encore déployé. Passer à true
// une fois la route en ligne.
export const FORGOT_PASSWORD_ENABLED = false;
const VAL_DIAMETER = 64;

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { login, post } = useApi();
  const passwordRef = useRef<TextInput>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const canSubmit = emailValid(email) && password.length > 0 && !submitting;

  const handleLogin = async () => {
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);
    try {
      // Réponse lue en entier d'abord (une seule tentative) : login d'ApiContext
      // ne garde pas error.message. Acceptée : login enregistre la session.
      const attempt = await postAuth('/auth/login', { email: email.trim(), password });
      if (!attempt.ok) {
        setError(loginErrorText(attempt.failure));
        setSubmitting(false);
        return;
      }
      await login(email.trim(), password);
      // Connecté : le parcours de première ouverture ne revient plus
      const fromOnboarding = onboardingStore.get().state.status === 'en-cours';
      onboardingStore.update({ status: 'termine' });
      if (fromOnboarding || !router.canGoBack()) router.replace('/apprendre');
      else router.back();
    } catch (err) {
      setError(loginErrorText(null, err instanceof Error ? err.message : undefined));
      setSubmitting(false);
    }
  };

  const forgotPassword = async () => {
    if (!FORGOT_PASSWORD_ENABLED || !emailValid(email)) return;
    try {
      // Réponse identique que l'adresse existe ou non
      await post('/auth/forgot-password', { email: email.trim() });
      setResetSent(true);
    } catch {
      setError('Impossible d’envoyer le lien pour l’instant. Réessaie dans un instant.');
    }
  };

  return (
    <KeyboardAvoidingView style={[styles.screen, { paddingTop: insets.top }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <BackButton onBack={() => (router.canGoBack() ? router.back() : router.replace('/apprendre'))} />
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ValBubble mood="complice" diameter={VAL_DIAMETER} text="Content de te revoir. Ta série t’attend." />
        <AppText variant="title1" accessibilityRole="header" style={styles.title}>
          Connexion
        </AppText>
        <SocialButtons />
        <TextField
          label="Adresse e-mail"
          value={email}
          onChangeText={(t) => {
            setEmail(t);
            setError(null);
          }}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="emailAddress"
          autoComplete="email"
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
          submitBehavior="submit"
          placeholder="ton@email.fr"
        />
        <TextField
          ref={passwordRef}
          label="Mot de passe"
          value={password}
          onChangeText={(t) => {
            setPassword(t);
            setError(null);
          }}
          secret
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="password"
          autoComplete="current-password"
          returnKeyType="done"
          onSubmitEditing={handleLogin}
          placeholder="Ton mot de passe"
        />

        <View style={styles.forgot}>
          <Button
            variant="link"
            tone="text"
            label="Mot de passe oublié ?"
            onPress={forgotPassword}
            disabled={!FORGOT_PASSWORD_ENABLED}
          />
          {!FORGOT_PASSWORD_ENABLED ? (
            <AppText variant="caption" tone="subtitle" style={styles.right}>
              Bientôt disponible dans l’app. En attendant, passe par le site.
            </AppText>
          ) : resetSent ? (
            <AppText variant="caption" tone="success" style={styles.right} accessibilityRole="alert">
              Si un compte existe avec cette adresse, un lien vient d’être envoyé.
            </AppText>
          ) : null}
        </View>

        {error ? (
          <AppText variant="callout" tone="error" accessibilityRole="alert">
            {error}
          </AppText>
        ) : null}

        {/* Développement seulement. « Rejouer la première ouverture » :
            le parcours repart de la bienvenue, progression gardée. « Tout
            réinitialiser » : toute la progression sans compte est effacée
            (parcours, prénom, objectif, leçons, XP, série, inscription
            fermée, célébration, flamme du jour, rappel programmé). */}
        {__DEV__ ? (
          <View style={styles.devRow}>
            <Button
              variant="text"
              label="Rejouer la première ouverture"
              onPress={() => {
                onboardingStore.replay();
                router.replace('/bienvenue');
              }}
            />
            <Button
              variant="textDanger"
              label="Tout réinitialiser"
              onPress={async () => {
                onboardingStore.reset();
                await Promise.all([resetReminder(), resetFlameIgnition()]);
                router.replace('/bienvenue');
              }}
            />
            {/* Séries simulées (sans compte) : terminer une leçon fait passer
                le palier suivant (3, 7, 30, 100) et lance sa célébration */}
            {DEV_STREAKS.map((d) => (
              <Button
                key={d.label}
                variant="text"
                label={d.label}
                onPress={() => {
                  onboardingStore.simulateStreak(d.days, d.missYesterday);
                  router.replace('/apprendre');
                }}
              />
            ))}
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + space[3] }]}>
        <Button label="Se connecter" onPress={handleLogin} disabled={!canSubmit} loading={submitting} />
        <Button variant="text" label="Pas encore de compte ? Créer un compte" onPress={() => router.replace('/client/register')} />
      </View>
    </KeyboardAvoidingView>
  );
}

// Développement : séries simulées pour voir les paliers sans attendre
const DEV_STREAKS = [
  { label: 'Série : 2 jours', days: 2, missYesterday: false },
  { label: 'Série : 6 jours', days: 6, missYesterday: false },
  { label: 'Série : 29 jours', days: 29, missYesterday: false },
  { label: 'Série : 99 jours', days: 99, missYesterday: false },
  { label: 'Série : 29 jours, gel utilisé hier', days: 29, missYesterday: true },
] as const;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  devRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: space[2],
  },
  header: {
    paddingHorizontal: space[5],
  },
  content: {
    paddingHorizontal: space[5],
    paddingTop: space[2],
    paddingBottom: space[6],
    gap: space[4],
  },
  title: {
    marginTop: space[1],
  },
  forgot: {
    alignItems: 'flex-end',
    gap: 2,
  },
  right: {
    textAlign: 'right',
  },
  footer: {
    paddingHorizontal: space[5],
    paddingTop: space[3],
    gap: space[1],
  },
});
