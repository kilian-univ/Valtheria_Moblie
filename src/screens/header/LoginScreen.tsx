import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getBasiquesStyles, getBoutonStyles, getInputStyles, palette } from '../../constants/style/Style';
import { useApi } from "../../context/ApiContext";
import { useTheme } from '../../context/ThemeContext';

import Toast from '@/src/components/Toast';
import Header from '@/src/components/topbar/header';

export default function LoginScreen({ navigation }: any) {
  const api = useApi();
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const basiques_styles = getBasiquesStyles(colorScheme);
  const bouton_styles = getBoutonStyles(colorScheme);
  const input_styles = getInputStyles(colorScheme);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const handleLogin = async () => {
    setError(null);

    if (!email || !password) {
      setError('Merci de remplir tous les champs.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.login(email, password);
      setShowToast(true);
    } catch (err: any) {
      setError(err.message || 'Identifiants incorrects.');
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
      <ScrollView contentContainerStyle={basiques_styles.container}>
        
        <Text style={basiques_styles.title}>Richesse</Text>
        <Text style={basiques_styles.subtitle}>Se connecter</Text>

        <View style={basiques_styles.form}>
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
            autoComplete="password"
          />

          {error && <Text style={basiques_styles.error}>{error}</Text>}

          <Pressable
            style={({ pressed }) => [
              bouton_styles.button,
              pressed && bouton_styles.buttonPressed,
            ]}
            onPress={handleLogin}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color={colors.onGold} />
            ) : (
              <Text style={bouton_styles.buttonText}>Se connecter</Text>
            )}
          </Pressable>

          <Pressable onPress={() => router.replace('/client/register')}>
            <Text style={input_styles.link}>Pas encore de compte ? S'inscrire</Text>
          </Pressable>
        </View>
      </ScrollView>

      <Toast
        message="Connexion réussie"
        visible={showToast}
        onHide={() => {
          setShowToast(false);
          router.back();
        }}
      />
      
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}