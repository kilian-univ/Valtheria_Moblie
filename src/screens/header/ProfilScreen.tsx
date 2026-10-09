import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ValsCoin from '@/src/components/common/ValsCoin';
import Header from '@/src/components/topbar/header';
import {
  getBasiquesStyles,
  getBoutonStyles,
  getProfileStyles,
  palette,
  fonts,
} from '@/src/constants/style/Style';
import { useApi } from '@/src/context/ApiContext';
import { useTheme } from '@/src/context/ThemeContext';
import { clearLastProfile } from '@/src/state/lastProfile';

export default function ProfileScreen() {
  const { user, isLoading, logout, exportUser, deleteAccount, updateUser } = useApi();
  const { colorScheme, toggleTheme } = useTheme();
  const colors = palette[colorScheme];
  const basiques_styles = getBasiquesStyles(colorScheme);
  const bouton_styles = getBoutonStyles(colorScheme);
  const profile_styles = getProfileStyles(colorScheme);

  // --- Édition du pseudo ---
  const [editingPseudo, setEditingPseudo] = useState(false);
  const [pseudo, setPseudo] = useState(user?.pseudo ?? '');
  const [pseudoSaving, setPseudoSaving] = useState(false);
  const [pseudoError, setPseudoError] = useState<string | null>(null);

  const savePseudo = async () => {
    if (!pseudo.trim()) {
      setPseudoError('Le pseudo ne peut pas être vide.');
      return;
    }
    setPseudoSaving(true);
    setPseudoError(null);
    try {
      await updateUser({ pseudo: pseudo.trim() });
      setEditingPseudo(false);
    } catch (err: any) {
      setPseudoError(err.message || 'Échec de la mise à jour.');
    } finally {
      setPseudoSaving(false);
    }
  };

  // --- Changement de mot de passe ---
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirmation, setNewPasswordConfirmation] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const savePassword = async () => {
    setPasswordError(null);
    setPasswordSuccess(false);

    if (!currentPassword || !newPassword || !newPasswordConfirmation) {
      setPasswordError('Merci de remplir tous les champs.');
      return;
    }
    if (newPassword !== newPasswordConfirmation) {
      setPasswordError('Les mots de passe ne correspondent pas.');
      return;
    }

    setPasswordSaving(true);
    try {
      // Hypothèse sur les noms de champs attendus par UserController::update
      // — à confirmer côté backend (current_password / password / password_confirmation ?)
      await updateUser({
        current_password: currentPassword,
        password: newPassword,
        password_confirmation: newPasswordConfirmation,
      } as any);
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setNewPasswordConfirmation('');
      setTimeout(() => setShowPasswordForm(false), 1200);
    } catch (err: any) {
      setPasswordError(err.message || 'Échec du changement de mot de passe.');
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleLogout = async () => {
    // Avant logout() : il déconnecte même si la requête échoue
    await clearLastProfile();
    await logout();
    router.back();
  };

  const handleExport = async () => {
    try {
      const data = await exportUser();
      console.log('Export RGPD :', data);
    } catch (err: any) {
      Alert.alert('Erreur', err.message);
    }
  };

  const handleDelete = () => {
    Alert.alert('Supprimer le compte', 'Cette action est définitive. Confirmer ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteAccount();
            await clearLastProfile();
            router.back();
          } catch (err: any) {
            Alert.alert('Erreur', err.message);
          }
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  const initial = user?.pseudo?.charAt(0)?.toUpperCase() ?? '?';

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
      <Header showBack />

      <ScrollView contentContainerStyle={profile_styles.scroll}>
        {/* Carte profil */}
        <View style={profile_styles.card}>
          <View style={profile_styles.profileHeader}>
            <View style={profile_styles.avatar}>
              <Text style={profile_styles.avatarText}>{initial}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={profile_styles.pseudo}>{user?.pseudo}</Text>
              <Text style={profile_styles.email}>{user?.email}</Text>
              <View style={profile_styles.badge}>
                <Text style={profile_styles.badgeText}>
                  Niveau {user?.level} · {user?.plan}
                </Text>
              </View>
            </View>
          </View>

          <View style={profile_styles.statsRow}>
            <View style={profile_styles.statItem}>
              <Text style={profile_styles.statValue}>{user?.xp ?? 0}</Text>
              <Text style={profile_styles.statLabel}>XP</Text>
            </View>
            <View style={profile_styles.statItem}>
              <Text style={profile_styles.statValue}>{user?.vals ?? 0}</Text>
              <ValsCoin size={18} style={profile_styles.coinIcon} />
              <Text style={profile_styles.statLabel}>Vals</Text>
            </View>
            <View style={profile_styles.statItem}>
              <Text style={profile_styles.statValue}>{user?.streak ?? 0}</Text>
              <Text style={profile_styles.statLabel}>Jours de suite</Text>
            </View>
          </View>
        </View>

        {/* Compte */}
        <View>
          <Text style={profile_styles.sectionTitle}>Compte</Text>
          <View style={profile_styles.card}>
            {/* Pseudo */}
            <View style={profile_styles.row}>
              {editingPseudo ? (
                <View style={{ flex: 1 }}>
                  <View style={profile_styles.inlineEditRow}>
                    <TextInput
                      style={profile_styles.smallInput}
                      value={pseudo}
                      onChangeText={setPseudo}
                      autoCapitalize="none"
                      autoFocus
                    />
                    <Pressable style={profile_styles.smallBtn} onPress={savePseudo} disabled={pseudoSaving}>
                      {pseudoSaving ? (
                        <ActivityIndicator size="small" color={colors.onGold} />
                      ) : (
                        <Text style={profile_styles.smallBtnText}>OK</Text>
                      )}
                    </Pressable>
                    <Pressable
                      style={profile_styles.smallBtnSecondary}
                      onPress={() => {
                        setEditingPseudo(false);
                        setPseudo(user?.pseudo ?? '');
                        setPseudoError(null);
                      }}
                    >
                      <Ionicons name="close" size={16} color={colors.subtitle} />
                    </Pressable>
                  </View>
                  {pseudoError && <Text style={basiques_styles.error}>{pseudoError}</Text>}
                </View>
              ) : (
                <>
                  <View style={profile_styles.rowLeft}>
                    <Ionicons name="person-outline" size={18} color={colors.subtitle} />
                    <Text style={profile_styles.rowLabel}>Pseudo</Text>
                  </View>
                  <Pressable
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                    onPress={() => setEditingPseudo(true)}
                  >
                    <Text style={{ color: colors.subtitle, fontSize: 14, fontFamily: fonts.body }}>{user?.pseudo}</Text>
                    <Ionicons name="pencil-outline" size={14} color={colors.gold} />
                  </Pressable>
                </>
              )}
            </View>

            {/* Mot de passe */}
            <View style={[profile_styles.row, profile_styles.rowLast]}>
              <Pressable
                style={{ flex: 1 }}
                onPress={() => setShowPasswordForm((v) => !v)}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={profile_styles.rowLeft}>
                    <Ionicons name="lock-closed-outline" size={18} color={colors.subtitle} />
                    <Text style={profile_styles.rowLabel}>Mot de passe</Text>
                  </View>
                  <Ionicons
                    name={showPasswordForm ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={colors.subtitle}
                  />
                </View>

                {showPasswordForm && (
                  <View style={{ marginTop: 14, gap: 10 }}>
                    <TextInput
                      style={profile_styles.smallInput}
                      placeholder="Mot de passe actuel"
                      placeholderTextColor={colors.subtitle}
                      secureTextEntry
                      value={currentPassword}
                      onChangeText={setCurrentPassword}
                    />
                    <TextInput
                      style={profile_styles.smallInput}
                      placeholder="Nouveau mot de passe"
                      placeholderTextColor={colors.subtitle}
                      secureTextEntry
                      value={newPassword}
                      onChangeText={setNewPassword}
                    />
                    <TextInput
                      style={profile_styles.smallInput}
                      placeholder="Confirmer le nouveau mot de passe"
                      placeholderTextColor={colors.subtitle}
                      secureTextEntry
                      value={newPasswordConfirmation}
                      onChangeText={setNewPasswordConfirmation}
                    />

                    {passwordError && <Text style={basiques_styles.error}>{passwordError}</Text>}
                    {passwordSuccess && (
                      <Text style={profile_styles.successText}>Mot de passe mis à jour ✓</Text>
                    )}

                    <Pressable
                      style={bouton_styles.button}
                      onPress={savePassword}
                      disabled={passwordSaving}
                    >
                      {passwordSaving ? (
                        <ActivityIndicator color={colors.onGold} />
                      ) : (
                        <Text style={bouton_styles.buttonText}>Mettre à jour</Text>
                      )}
                    </Pressable>
                  </View>
                )}
              </Pressable>
            </View>
          </View>
        </View>

        {/* Préférences */}
        <View>
          <Text style={profile_styles.sectionTitle}>Préférences</Text>
          <View style={profile_styles.card}>
            <Pressable style={[profile_styles.row, profile_styles.rowLast]} onPress={toggleTheme}>
              <View style={profile_styles.rowLeft}>
                <Ionicons
                  name={colorScheme === 'dark' ? 'moon-outline' : 'sunny-outline'}
                  size={18}
                  color={colors.subtitle}
                />
                <Text style={profile_styles.rowLabel}>Thème</Text>
              </View>
              <Text style={{ color: colors.subtitle, fontSize: 14, fontFamily: fonts.body }}>
                {colorScheme === 'dark' ? 'Sombre' : 'Clair'}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Données & compte */}
        <View>
          <Text style={profile_styles.sectionTitle}>Données</Text>
          <View style={profile_styles.card}>
            <Pressable style={profile_styles.row} onPress={handleExport}>
              <View style={profile_styles.rowLeft}>
                <Ionicons name="download-outline" size={18} color={colors.subtitle} />
                <Text style={profile_styles.rowLabel}>Exporter mes données</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.subtitle} />
            </Pressable>

            <Pressable style={profile_styles.row} onPress={handleLogout}>
              <View style={profile_styles.rowLeft}>
                <Ionicons name="log-out-outline" size={18} color={colors.subtitle} />
                <Text style={profile_styles.rowLabel}>Se déconnecter</Text>
              </View>
            </Pressable>

            <Pressable style={[profile_styles.row, profile_styles.rowLast]} onPress={handleDelete}>
              <View style={profile_styles.rowLeft}>
                <Ionicons name="trash-outline" size={18} color={colors.error} />
                <Text style={profile_styles.rowLabelDanger}>Supprimer mon compte</Text>
              </View>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}