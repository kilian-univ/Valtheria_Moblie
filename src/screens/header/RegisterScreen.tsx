import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getBasiquesStyles, getBoutonStyles, getInputStyles, palette } from '../../constants/style/Style';
import { useApi } from "../../context/ApiContext";
import { useTheme } from '../../context/ThemeContext';

import Header from '../../components/topbar/header';

export default function RegisterScreen({ navigation }: any) {
  const api = useApi();
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const basiques_styles = getBasiquesStyles(colorScheme);
  const bouton_styles = getBoutonStyles(colorScheme);
  const input_styles = getInputStyles(colorScheme);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRegister = async () => {
    setError(null);

    if (!name || !email || !password || !passwordConfirmation) {
      setError('Merci de remplir tous les champs.');
      return;
    }

    if (password !== passwordConfirmation) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.register(name, email, password, passwordConfirmation);
      navigation?.navigate?.('index');
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue lors de l'inscription.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['bottom']}>
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Header showBack hideAuthActions />
      <View style={basiques_styles.container}>
        <Text style={basiques_styles.title}>Richesse</Text>
        <Text style={basiques_styles.subtitle}>Créer un compte</Text>

        <View style={basiques_styles.form}>
          <TextInput
            style={input_styles.input}
            placeholder="Nom"
            placeholderTextColor={colors.subtitle}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />

          <TextInput
            style={input_styles.input}
            placeholder="Email"
            placeholderTextColor={colors.subtitle}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />

          <TextInput
            style={input_styles.input}
            placeholder="Mot de passe"
            placeholderTextColor={colors.subtitle}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password-new"
          />

          <TextInput
            style={input_styles.input}
            placeholder="Confirmer le mot de passe"
            placeholderTextColor={colors.subtitle}
            value={passwordConfirmation}
            onChangeText={setPasswordConfirmation}
            secureTextEntry
            autoComplete="password-new"
          />

          {error && <Text style={basiques_styles.error}>{error}</Text>}

          <Pressable
            style={({ pressed }) => [
              bouton_styles.button,
              pressed && bouton_styles.buttonPressed,
            ]}
            onPress={handleRegister}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color={colors.onGold} />
            ) : (
              <Text style={bouton_styles.buttonText}>S'inscrire</Text>
            )}
          </Pressable>

          <Pressable onPress={() => router.replace('/client/login')}>
            <Text style={input_styles.link}>Déjà un compte ? Se connecter</Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}