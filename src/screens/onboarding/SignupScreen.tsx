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
import ReminderPromise from '@/src/components/onboarding/ReminderPromise';
import SocialButtons from '@/src/components/onboarding/SocialButtons';
import StepHeader from '@/src/components/onboarding/StepHeader';
import { PRIVACY_URL, TERMS_URL } from '@/src/constants/links';
import { palette, space } from '@/src/constants/style/Style';
import { useApi } from '@/src/context/ApiContext';
import { useTheme } from '@/src/context/ThemeContext';
import { type Objective } from '@/src/lesson/discovery';
import { onboardingStore, useOnboarding } from '@/src/state/onboarding';
import { enableReminder } from '@/src/state/reminder';
import {
  cleanFirstName,
  emailValid,
  passwordValid,
  PASSWORD_RULES,
  pseudoError,
  pseudoFromFirstName,
  sendDiscoveryCredit,
  signupError,
  signupErrorFrom,
  signupStartStep,
  type SignupStep,
  signupSteps,
} from '@/src/utils/onboarding';
import { isNetworkMessage, isRegistrationClosed } from '@/src/utils/authErrors';
import { postAuth } from '@/src/utils/authProbe';
import { DEFAULT_REMINDER, ReminderTime } from '@/src/utils/reminder';
import { track } from '@/src/utils/track';

const VAL_DIAMETER = 64;

type Step = SignupStep;

// Inscription en deux étapes : le compte (pseudo, adresse, mot de passe),
// puis le rappel. Le pseudo est proposé d'après le prénom donné à Val, et
// modifiable ; sans prénom, le champ est vide. Val ne se présente pas de
// nouveau : il l'a fait sur la bienvenue (décision du 20/10/2026).
// La mémoire du téléphone (prénom, pseudo, étape) est lue avant tout : le
// pseudo proposé et l'étape d'arrivée en dépendent
export default function SignupScreen() {
  const { loaded } = useOnboarding();
  useEffect(() => {
    if (!loaded) onboardingStore.load();
  }, [loaded]);
  if (!loaded) return <View style={styles.screen} />;
  return <SignupFlow />;
}

function SignupFlow() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { register, login, post, isAuthenticated } = useApi();
  const { state } = useOnboarding();

  const steps = signupSteps();
  const [step, setStep] = useState<Step>(() => signupStartStep(state.step));
  // Pseudo déjà choisi, sinon proposé d'après le prénom donné à Val
  const fromFirstName = !state.pseudo && pseudoFromFirstName(state.firstName) !== '';
  const [pseudo, setPseudo] = useState(state.pseudo || pseudoFromFirstName(state.firstName));
  const [pseudoTouched, setPseudoTouched] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<{ text: string; emailTaken: boolean } | null>(null);
  const [time, setTime] = useState<ReminderTime>(DEFAULT_REMINDER);
  const [reminderRefused, setReminderRefused] = useState(false);
  // Le serveur n'accepte pas encore d'inscription depuis l'app (403)
  const [closed, setClosed] = useState(false);
  const passwordRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);

  // Une seule fois, à l'arrivée sur l'inscription (objectif figé à ce moment-là)
  const [startObjective] = useState(state.objective);
  useEffect(() => {
    track('inscription_commencee', { objectif: startObjective });
  }, [startObjective]);

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

  const back = () => {
    if (router.canGoBack()) router.back();
    // Parcours repris directement sur l'inscription : retour à la fin de leçon
    else router.replace(state.status === 'en-cours' && state.objective ? '/bienvenue/fin' : '/apprendre');
  };

  // Fin du parcours : l'accueil d'Apprendre, connecté
  const finish = () => {
    onboardingStore.update({ status: 'termine' });
    router.replace('/apprendre');
  };

  // ---------------------------------------------------------------------------
  // Étape 1 : compte (pseudo, adresse, mot de passe)
  // ---------------------------------------------------------------------------
  const cleanPseudo = pseudo.trim();
  const pseudoProblem = pseudoError(cleanPseudo);
  const canCreate = emailValid(email) && passwordValid(password) && !submitting && !pseudoProblem;

  // Compte créé (le jeton est enregistré par ApiContext)
  const accountCreated = () => {
    track('compte_cree', { objectif: state.objective });
    onboardingStore.update({ status: 'termine', step: 'rappel', signupClosedAt: null });
    // Leçon découverte créditée dès que le jeton du nouveau compte est en
    // place (voir l'effet plus haut)
    if (state.objective) pendingCredit.current = state.objective;
    setStep('rappel');
  };

  // Inscription refusée par register : la même demande, relue en entier,
  // donne le code (inscription fermée) et error.message. Aucune condition
  // dans un try, ni « finally » : le compilateur React sauterait l'écran.
  const afterRegisterFailure = async (err: unknown, body: { name: string; email: string; password: string; password_confirmation: string }) => {
    const message = err instanceof Error ? err.message : undefined;
    if (isNetworkMessage(message)) {
      setError(signupError(message));
      return;
    }
    let again: Awaited<ReturnType<typeof postAuth>> | null = null;
    try {
      again = await postAuth('/auth/register', body);
    } catch {
      again = null;
    }
    if (again === null) {
      setError(signupErrorFrom(null, message));
      return;
    }
    if (again.ok) {
      // Passée cette fois (erreur passagère) : on se connecte avec le compte créé
      let loggedIn = false;
      try {
        await login(body.email, body.password);
        loggedIn = true;
      } catch {
        loggedIn = false;
      }
      if (loggedIn) accountCreated();
      else setError(signupErrorFrom(null, message));
    } else if (isRegistrationClosed(again.failure)) {
      // Pseudo et objectif restent mémorisés pour une prochaine tentative ;
      // l'accueil sans compte s'en souvient
      onboardingStore.update({ signupClosedAt: Date.now() });
      setClosed(true);
    } else {
      // Le serveur répond autre chose : l'inscription est ouverte
      onboardingStore.update({ signupClosedAt: null });
      setError(signupErrorFrom(again.failure, message));
    }
  };

  const createAccount = async () => {
    setPseudoTouched(true);
    if (!canCreate) return;
    onboardingStore.update({ pseudo: cleanPseudo });
    setSubmitting(true);
    setError(null);
    const body = { name: cleanPseudo, email: email.trim(), password, password_confirmation: password };
    try {
      // name = pseudo, password_confirmation = password (le serveur prend name
      // à défaut de pseudo)
      await register(body.name, body.email, body.password, body.password_confirmation);
      accountCreated();
    } catch (err) {
      await afterRegisterFailure(err, body);
    }
    setSubmitting(false);
  };

  // Inscription fermée : « Revenir plus tard » mène à l'accueil sans compte
  const later = () => {
    onboardingStore.update({ status: 'plus-tard' });
    router.replace('/apprendre');
  };

  // ---------------------------------------------------------------------------
  // Étape 2 : rappel
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

  // Champ du pseudo, dans l'étape du compte (« suivant » passe à l'adresse e-mail)
  const focusEmail = () => emailRef.current?.focus();
  const pseudoField = (
    <TextField
      label="Ton pseudo"
      value={pseudo}
      onChangeText={(t) => {
        setPseudo(t);
        setError(null);
      }}
      onBlur={() => setPseudoTouched(true)}
      autoCapitalize="none"
      autoCorrect={false}
      textContentType="nickname"
      autoComplete="username-new"
      returnKeyType="next"
      onSubmitEditing={focusEmail}
      submitBehavior="submit"
      maxLength={20}
      // Prérempli : un pseudo à corriger se signale tout de suite
      error={(pseudoTouched || fromFirstName) && cleanPseudo ? pseudoProblem : null}
      hint={fromFirstName ? 'Proposé d’après ton prénom : tu peux le changer.' : 'Visible seulement si tu partages ta progression.'}
    />
  );

  if (closed) {
    // Inscription fermée pour le moment : pas d'erreur rouge, une porte ouverte
    body = (
      <>
        <ValBubble
          mood="rassurant"
          diameter={VAL_DIAMETER}
          text="Ta progression de la leçon découverte est gardée sur ton téléphone. Si tu as déjà un compte, connecte-toi."
        />
        <AppText variant="title2" accessibilityRole="header" style={styles.title}>
          Les inscriptions ouvrent très bientôt
        </AppText>
      </>
    );
    footer = (
      <>
        <Button label="J’ai déjà un compte" onPress={() => router.push('/client/login')} />
        <Button variant="secondary" label="Revenir plus tard" onPress={later} />
      </>
    );
  } else if (step === 'compte') {
    const name = cleanFirstName(state.firstName) || cleanPseudo;
    body = (
      <>
        <AppText variant="title2" accessibilityRole="header">
          {name ? `Dernière étape, ${name}` : 'Dernière étape'}
        </AppText>
        <AppText variant="callout" tone="subtitle">
          Pour garder ta série sur tous tes appareils.
        </AppText>
        <SocialButtons />
        {pseudoField}
        <TextField
          ref={emailRef}
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
            choisir ton heure dans les Réglages.
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
        <StepHeader
          onBack={step === 'rappel' ? undefined : closed ? () => setClosed(false) : back}
          step={steps.indexOf(step) + 1}
          total={steps.length}
        />
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
