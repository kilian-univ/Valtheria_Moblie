import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { ReactNode, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AppText from '@/src/components/common/AppText';
import Button from '@/src/components/common/Button';
import TextField from '@/src/components/common/TextField';
import ValBubble from '@/src/components/common/ValBubble';
import ReminderPicker from '@/src/components/onboarding/ReminderPicker';
import SocialButtons from '@/src/components/onboarding/SocialButtons';
import StepHeader from '@/src/components/onboarding/StepHeader';
import { palette, radius, space } from '@/src/constants/style/Style';
import { useApi } from '@/src/context/ApiContext';
import { useTheme } from '@/src/context/ThemeContext';
import { discoveryPlan, type Objective } from '@/src/lesson/discovery';
import { onboardingStore, useOnboarding } from '@/src/state/onboarding';
import { enableReminder } from '@/src/state/reminder';
import {
  emailValid,
  passwordValid,
  PASSWORD_RULES,
  pseudoError,
  sendDiscoveryCredit,
  signupError,
} from '@/src/utils/onboarding';
import { DEFAULT_REMINDER, ReminderTime } from '@/src/utils/reminder';
import { track } from '@/src/utils/track';

// Pages légales du site (routes web cgu et politique, routes/web.php)
const TERMS_URL = 'https://valtheria.fr/cgu';
const PRIVACY_URL = 'https://valtheria.fr/politique-confidentialite';
const VAL_DIAMETER = 64;

type Step = 'pseudo' | 'compte' | 'rappel';
const STEP_NUMBER: Record<Step, number> = { pseudo: 1, compte: 2, rappel: 3 };

// Inscription en trois étapes : pseudo, compte, rappel. Reprend à l'étape
// mémorisée ; ouverte d'ailleurs (« Créer mon compte »), elle part du pseudo.
export default function SignupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { register, post, isAuthenticated } = useApi();
  const { state } = useOnboarding();
  const plan = state.objective ? discoveryPlan(state.objective) : null;

  const [step, setStep] = useState<Step>(() =>
    state.step === 'compte' || state.step === 'rappel' ? state.step : 'pseudo'
  );
  const [pseudo, setPseudo] = useState(state.pseudo);
  const [pseudoTouched, setPseudoTouched] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<{ text: string; emailTaken: boolean } | null>(null);
  const [time, setTime] = useState<ReminderTime>(DEFAULT_REMINDER);
  const [reminderRefused, setReminderRefused] = useState(false);
  const passwordRef = useRef<TextInput>(null);

  useEffect(() => {
    track('inscription_commencee', { objectif: state.objective });
    // Une seule fois, à l'arrivée sur l'inscription
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Leçon découverte : 20 XP et la série du jour, une seule fois. Envoyée
  // avec le post du rendu où le jeton existe (celui d'avant l'inscription
  // partirait sans jeton, et un 401 effacerait la session). L'objectif ne part
  // que si le serveur l'accepte ; en erreur, rien n'est montré.
  const pendingCredit = useRef<Objective | null>(null);
  useEffect(() => {
    const objective = pendingCredit.current;
    if (!isAuthenticated || !objective) return;
    pendingCredit.current = null;
    sendDiscoveryCredit(post, objective);
    // step : le passage à « rappel » suit toujours l'inscription, il relance
    // l'effet même si le jeton était déjà là avant
  }, [isAuthenticated, post, step]);

  const goTo = (next: Step) => {
    setStep(next);
    onboardingStore.update({ step: next });
  };

  const back = () => {
    if (step === 'compte') goTo('pseudo');
    else if (router.canGoBack()) router.back();
    // Parcours repris directement sur l'inscription : retour à la fin de leçon
    else router.replace(state.status === 'en-cours' && state.objective ? '/bienvenue/fin' : '/apprendre');
  };

  // Fin du parcours : l'accueil d'Apprendre, connecté
  const finish = () => {
    onboardingStore.update({ status: 'termine' });
    router.replace('/apprendre');
  };

  // ---------------------------------------------------------------------------
  // Étape 1 : pseudo
  // ---------------------------------------------------------------------------
  const cleanPseudo = pseudo.trim();
  const pseudoProblem = pseudoError(cleanPseudo);

  const submitPseudo = () => {
    setPseudoTouched(true);
    if (pseudoProblem) return;
    onboardingStore.update({ pseudo: cleanPseudo });
    goTo('compte');
  };

  // ---------------------------------------------------------------------------
  // Étape 2 : compte
  // ---------------------------------------------------------------------------
  const canCreate = emailValid(email) && passwordValid(password) && !submitting;

  const createAccount = async () => {
    if (!canCreate) return;
    setSubmitting(true);
    setError(null);
    try {
      // name = pseudo, password_confirmation = password (le serveur prend name
      // à défaut de pseudo)
      await register(cleanPseudo, email.trim(), password, password);
      track('compte_cree', { objectif: state.objective });
      onboardingStore.update({ status: 'termine', step: 'rappel' });
      // Leçon découverte créditée dès que le jeton du nouveau compte est en
      // place (voir l'effet plus haut)
      if (state.objective) pendingCredit.current = state.objective;
      setStep('rappel');
    } catch (err) {
      setError(signupError(err instanceof Error ? err.message : undefined));
    } finally {
      setSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Étape 3 : rappel
  // ---------------------------------------------------------------------------
  const activate = async () => {
    setSubmitting(true);
    const granted = await enableReminder(time);
    setSubmitting(false);
    if (!granted) {
      setReminderRefused(true);
      return;
    }
    track('rappel_active', { heure: time.hour, minute: time.minute });
    finish();
  };

  // ---------------------------------------------------------------------------
  // Rendu
  // ---------------------------------------------------------------------------
  let body: ReactNode;
  let footer: ReactNode;

  if (step === 'pseudo') {
    body = (
      <>
        <ValBubble
          mood="complice"
          diameter={VAL_DIAMETER}
          text={plan ? plan.valLine : 'Moi, c’est Val. Et toi ?'}
        />
        <AppText variant="title2" accessibilityRole="header" style={styles.title}>
          Comment Val doit t’appeler ?
        </AppText>
        <TextField
          label="Ton pseudo"
          value={pseudo}
          onChangeText={setPseudo}
          onBlur={() => setPseudoTouched(true)}
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="nickname"
          autoComplete="username-new"
          returnKeyType="next"
          onSubmitEditing={submitPseudo}
          maxLength={20}
          error={pseudoTouched && cleanPseudo ? pseudoProblem : null}
          hint="Visible seulement si tu partages ta progression."
        />
      </>
    );
    footer = <Button label="Continuer" onPress={submitPseudo} disabled={!cleanPseudo} />;
  } else if (step === 'compte') {
    body = (
      <>
        <AppText variant="title2" accessibilityRole="header">
          {`Dernière étape, ${cleanPseudo}`}
        </AppText>
        <AppText variant="callout" tone="subtitle">
          Pour garder ta série sur tous tes appareils.
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
        <View style={styles.passwordBlock}>
          <PasswordRules password={password} />
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
            textContentType="newPassword"
            autoComplete="new-password"
            passwordRules="minlength: 8;"
            returnKeyType="done"
            onSubmitEditing={createAccount}
          />
        </View>
        {error ? (
          <View style={styles.error} accessibilityRole="alert">
            <AppText variant="callout" tone="error">
              {error.text}
            </AppText>
            {error.emailTaken ? (
              <Button variant="text" label="Me connecter" onPress={() => router.push('/client/login')} />
            ) : null}
          </View>
        ) : null}
      </>
    );
    footer = (
      <>
        <Button label="Créer mon compte" onPress={createAccount} disabled={!canCreate} loading={submitting} />
        <AppText variant="caption" tone="subtitle" style={styles.legal}>
          En continuant, tu acceptes les{' '}
          <AppText variant="caption" style={styles.link} onPress={() => WebBrowser.openBrowserAsync(TERMS_URL)} accessibilityRole="link">
            conditions d’utilisation
          </AppText>{' '}
          et la{' '}
          <AppText variant="caption" style={styles.link} onPress={() => WebBrowser.openBrowserAsync(PRIVACY_URL)} accessibilityRole="link">
            politique de confidentialité
          </AppText>
          .
        </AppText>
      </>
    );
  } else {
    body = (
      <>
        <ValBubble mood="determine" diameter={VAL_DIAMETER} text="Le secret, c’est la régularité. Je te fais signe chaque jour ?" />
        <AppText variant="title2" accessibilityRole="header" style={styles.title}>
          Quand veux-tu qu’on se retrouve ?
        </AppText>
        <ReminderPicker value={time} onChange={setTime} />
        <ReminderPromise />
        {reminderRefused ? (
          <AppText variant="callout" tone="subtitle" accessibilityRole="alert">
            Les notifications sont coupées pour Valtheria. Tu peux les autoriser dans les réglages du téléphone, puis
            choisir ton heure dans ton profil.
          </AppText>
        ) : null}
      </>
    );
    footer = (
      <>
        <Button label="Activer mon rappel" onPress={activate} loading={submitting} />
        <Button variant="text" label="Pas maintenant" onPress={finish} />
      </>
    );
  }

  return (
    <KeyboardAvoidingView style={[styles.screen, { paddingTop: insets.top }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <StepHeader onBack={step === 'rappel' ? undefined : back} step={STEP_NUMBER[step]} total={3} />
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {body}
      </ScrollView>
      {/* Bouton toujours visible, au-dessus du clavier */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + space[3] }]}>{footer}</View>
    </KeyboardAvoidingView>
  );
}

// Règles du mot de passe, affichées avant la saisie, cochées en vert au fil
// de la frappe
function PasswordRules({ password }: { password: string }) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  return (
    <View style={styles.rules}>
      {PASSWORD_RULES.map((rule) => {
        const ok = rule.test(password);
        return (
          <View
            key={rule.id}
            style={styles.rule}
            accessible
            accessibilityLabel={`${rule.label}${ok ? ', respecté' : ''}`}
          >
            <Ionicons
              name={ok ? 'checkmark-circle' : 'ellipse-outline'}
              size={16}
              color={ok ? colors.success : colors.subtitle}
            />
            <AppText variant="caption" tone={ok ? 'success' : 'subtitle'}>
              {rule.label}
            </AppText>
          </View>
        );
      })}
    </View>
  );
}

function ReminderPromise() {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  return (
    <View style={[styles.promise, { backgroundColor: colors.surface }]}>
      <Ionicons name="notifications-outline" size={22} color={colors.gold} />
      <AppText variant="callout" tone="subtitle" style={styles.promiseText}>
        Un seul rappel par jour, jamais plus. Tu peux le couper à tout moment dans ton profil.
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    paddingLeft: space[2],
    paddingRight: space[4],
  },
  content: {
    paddingHorizontal: space[5],
    paddingTop: space[4],
    paddingBottom: space[6],
    gap: space[4],
  },
  title: {
    marginTop: space[2],
  },
  passwordBlock: {
    gap: space[2],
  },
  rules: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space[3],
  },
  rule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  error: {
    gap: space[1],
    alignItems: 'flex-start',
  },
  promise: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space[3] - 2,
    padding: space[4] - 2,
    borderRadius: radius.option,
  },
  promiseText: {
    flex: 1,
  },
  footer: {
    paddingHorizontal: space[5],
    paddingTop: space[3],
    gap: space[2],
  },
  legal: {
    textAlign: 'center',
  },
  link: {
    textDecorationLine: 'underline',
  },
});
