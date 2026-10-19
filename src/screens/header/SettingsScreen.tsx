import Constants from 'expo-constants';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppText from '@/src/components/common/AppText';
import BackButton from '@/src/components/common/BackButton';
import BottomSheet from '@/src/components/common/BottomSheet';
import Button from '@/src/components/common/Button';
import PageState from '@/src/components/common/PageState';
import SoundSettingRow from '@/src/components/common/SoundSettingRow';
import TextField from '@/src/components/common/TextField';
import ReminderSettingRow from '@/src/components/onboarding/ReminderSettingRow';
import BudgetReminderSettingRow from '@/src/components/budget/BudgetReminderSettingRow';
import ObjectiveSheet from '@/src/components/profile/ObjectiveSheet';
import ProfileAvatar from '@/src/components/profile/ProfileAvatar';
import { SettingsRow, SettingsSection, useSettingsRowStyles } from '@/src/components/profile/SettingsList';
import { FORGOT_PASSWORD_URL, HELP_URL, LEGAL_NOTICE_URL, PRIVACY_URL, TERMS_URL } from '@/src/constants/links';
import { fonts, palette, radius, size, space } from '@/src/constants/style/Style';
import { useApi } from '@/src/context/ApiContext';
import { useTheme } from '@/src/context/ThemeContext';
import { useEmailConfirmation } from '@/src/hooks/useEmailConfirmation';
import { useProfile } from '@/src/hooks/useProfile';
import type { Objective } from '@/src/lesson/discovery';
import { FORGOT_PASSWORD_ENABLED } from '@/src/screens/header/LoginScreen';
import { clearLastProfile } from '@/src/state/lastProfile';
import { shareJsonFile } from '@/src/state/exportData';
import { purgeAccountData } from '@/src/state/purge';
import { success } from '@/src/utils/haptics';
import { actionErrorText } from '@/src/utils/loadError';
import { pseudoError } from '@/src/utils/onboarding';
import { initialOf, levelA11y, truncateEmail } from '@/src/utils/profile';

const AVATAR = 64;

type Sheet = 'pseudo' | 'password' | 'objective' | 'legal' | 'delete' | null;

// Réglages (ouverts par la roue dentée du profil) : compte, préférences,
// données. Reprend tout le comportement de l'ancien profil : pseudo, mot de
// passe, rappel, sons, thème, export, déconnexion, suppression. La
// suppression reste facile à trouver (règle d'Apple) : une ligne grisée,
// sans rouge ; le rouge n'apparaît que dans la confirmation.
export default function SettingsScreen() {
  const { user, logout, exportUser, updateUser, post, isAuthenticated, isLoading } = useApi();
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const p = useProfile();
  const emailConfirmation = useEmailConfirmation();
  const rowStyles = useSettingsRowStyles();
  const lastRowStyles = useSettingsRowStyles(true);

  // Une feuille à la fois ; « mounted » reste vrai pendant la fermeture
  const [sheet, setSheet] = useState<Sheet>(null);
  const [mounted, setMounted] = useState<Sheet>(null);
  const open = (s: Exclude<Sheet, null>) => {
    setMounted(s);
    setSheet(s);
  };
  const close = useCallback(() => setSheet(null), []);
  const unmount = useCallback(() => setMounted(null), []);

  // --- Pseudo (règles du serveur, comme à l'inscription) ---
  const [pseudo, setPseudo] = useState('');
  const [pseudoTouched, setPseudoTouched] = useState(false);
  const [pseudoSaving, setPseudoSaving] = useState(false);
  const [pseudoServerError, setPseudoServerError] = useState<string | null>(null);
  const cleanPseudo = pseudo.trim();
  const pseudoProblem = pseudoError(cleanPseudo);
  const openPseudo = () => {
    setPseudo(user?.pseudo ?? '');
    setPseudoTouched(false);
    setPseudoServerError(null);
    open('pseudo');
  };
  const savePseudo = async () => {
    setPseudoTouched(true);
    if (pseudoProblem) return;
    if (cleanPseudo === user?.pseudo) {
      close();
      return;
    }
    setPseudoSaving(true);
    setPseudoServerError(null);
    try {
      await updateUser({ pseudo: cleanPseudo } as unknown as Parameters<typeof updateUser>[0]);
      success();
      close();
    } catch (err) {
      setPseudoServerError(actionErrorText(err, 'La mise à jour n’a pas abouti. Réessaie dans un instant.'));
    } finally {
      setPseudoSaving(false);
    }
  };

  // --- Mot de passe : l'API n'a pas de route pour le changer ; un lien de
  // réinitialisation par e-mail (dans l'app quand la route est en ligne,
  // sinon sur le site) ---
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const sendReset = async () => {
    setResetError(null);
    if (!FORGOT_PASSWORD_ENABLED) {
      WebBrowser.openBrowserAsync(FORGOT_PASSWORD_URL).catch(() => {});
      return;
    }
    try {
      await post('/auth/forgot-password', { email: user?.email ?? '' });
      setResetSent(true);
    } catch {
      setResetError('Impossible d’envoyer le lien pour l’instant. Réessaie dans un instant.');
    }
  };

  // --- Objectif ---
  const pickObjective = async (next: Objective) => {
    close();
    if (next !== p.objective) await p.changeObjective(next);
  };

  // --- Données ---
  const handleExport = async () => {
    // 7 jours sans confirmer l'adresse : l'export attend la confirmation
    if (emailConfirmation.required) {
      const to = emailConfirmation.email ? ` envoyé à ${emailConfirmation.email}` : '';
      Alert.alert(
        'Confirme ton adresse e-mail',
        `L’export de tes données attend la confirmation de ton adresse : touche le lien du courriel${to}.`,
        [
          { text: 'Plus tard', style: 'cancel' },
          ...(emailConfirmation.left > 0 ? [] : [{ text: 'Renvoyer le courriel', onPress: () => void emailConfirmation.resend() }]),
        ]
      );
      return;
    }
    try {
      const data = await exportUser();
      // Un fichier JSON, partagé par la feuille de partage (décision du 17 octobre 2026)
      await shareJsonFile(data);
    } catch (err) {
      Alert.alert('Export impossible', actionErrorText(err, 'Réessaie dans un instant.', 'Pas de connexion internet. Réessaie dans un instant.'));
    }
  };

  const handleLogout = async () => {
    // logout() ne lève jamais d'erreur : jeton révoqué si le réseau le permet,
    // session effacée et données de la personne purgées du téléphone même hors
    // ligne, dernier profil (identifiant, pseudo) gardé (voir ApiContext)
    await logout();
    router.dismissTo('/apprendre');
  };

  // Suppression du compte (règle d'Apple) : confirmée par le mot de passe, que le site exige.
  // POST /user/delete : le DELETE /user d'ApiContext part sans corps, donc sans mot de passe.
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const handleDelete = () => {
    setDeletePassword('');
    setDeleteError(null);
    open('delete');
  };
  const confirmDelete = async () => {
    // Identifiant gardé avant : la déconnexion efface le profil
    const userId = user?.id;
    setDeleting(true);
    setDeleteError(null);
    try {
      await post('/user/delete', { password: deletePassword });
    } catch (err) {
      setDeleting(false);
      setDeleteError(actionErrorText(err, 'La suppression n’a pas abouti. Réessaie dans un instant.', 'Pas de connexion internet : ton compte n’a pas été supprimé. Réessaie dans un instant.'));
      return;
    }
    // Les jetons sont révoqués côté serveur : la déconnexion ne fait plus que vider le téléphone
    await logout().catch(() => {});
    await clearLastProfile();
    if (userId != null) await purgeAccountData(userId);
    setDeleting(false);
    close();
    router.dismissTo('/apprendre');
    Alert.alert('Compte supprimé', 'Ton compte est désactivé. Il sera supprimé définitivement dans 30 jours. Pour le réactiver avant, écris à contact@valtheria.fr.');
  };

  const pseudoNow = user?.pseudo ?? '';
  const version = Constants.expoConfig?.version ?? '';

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.bar}>
        <BackButton onBack={() => router.back()} />
        <AppText variant="bodyMedium" accessibilityRole="header" style={styles.barTitle}>
          Réglages
        </AppText>
        <View style={styles.barSpacer} />
      </View>

      {!isLoading && !isAuthenticated ? (
        // Sans compte (lien direct, ou juste après la déconnexion) : rien à
        // régler ici, et aucune action qui échouerait en 401
        <PageState
          variant="empty"
          text="Tes réglages apparaissent dès que tu te connectes."
          actionLabel="Se connecter"
          onAction={() => router.replace('/client/login')}
        />
      ) : (
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.identity, { backgroundColor: colors.optionFace }]}>
          <ProfileAvatar size={AVATAR} initial={initialOf(pseudoNow)} ratio={p.level.ratio} accessibilityLabel={levelA11y(p.level)} />
          <AppText variant="bodyMedium" style={styles.identityName} numberOfLines={1}>
            {pseudoNow}
          </AppText>
        </View>

        <SettingsSection title="Compte">
          <SettingsRow icon="person-outline" label="Pseudo" value={pseudoNow} onPress={openPseudo} accessibilityHint="Modifier ton pseudo" />
          <SettingsRow icon="mail-outline" label="E-mail" value={truncateEmail(user?.email)} />
          <SettingsRow
            icon="lock-closed-outline"
            label="Mot de passe"
            onPress={() => {
              setResetSent(false);
              setResetError(null);
              open('password');
            }}
            last
          />
        </SettingsSection>

        <SettingsSection title="Préférences">
          <SettingsRow icon="flag-outline" label="Ton objectif" value={p.objectiveLabel} onPress={() => open('objective')} />
          <ReminderSettingRow {...rowStyles} iconSize={20} />
          <BudgetReminderSettingRow {...rowStyles} iconSize={20} />
          <SoundSettingRow {...lastRowStyles} iconSize={20} />
        </SettingsSection>

        <SettingsSection title="Données et compte">
          <SettingsRow icon="download-outline" label="Exporter mes données" onPress={handleExport} />
          <SettingsRow icon="help-circle-outline" label="Aide et contact" onPress={() => WebBrowser.openBrowserAsync(HELP_URL).catch(() => {})} />
          <SettingsRow icon="document-text-outline" label="Confidentialité et conditions" onPress={() => open('legal')} />
          <SettingsRow icon="log-out-outline" label="Se déconnecter" onPress={handleLogout} chevron={false} />
          <SettingsRow icon="trash-outline" label="Supprimer mon compte" onPress={handleDelete} muted last />
        </SettingsSection>

        <AppText variant="caption" tone="subtitle" style={styles.version}>
          {`Valtheria, version ${version}`}
        </AppText>
      </ScrollView>
      )}

      {mounted === 'pseudo' ? (
        <BottomSheet open={sheet === 'pseudo'} onRequestClose={close} onClosed={unmount}>
          <View style={styles.sheet}>
            <AppText variant="title3" accessibilityRole="header">
              Ton pseudo
            </AppText>
            <TextField
              label="Ton pseudo"
              value={pseudo}
              onChangeText={(t) => {
                setPseudo(t);
                setPseudoServerError(null);
              }}
              onBlur={() => setPseudoTouched(true)}
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="nickname"
              autoComplete="username"
              returnKeyType="done"
              onSubmitEditing={savePseudo}
              maxLength={20}
              error={pseudoServerError ?? (pseudoTouched && cleanPseudo ? pseudoProblem : null)}
              hint="Visible seulement si tu partages ta progression."
            />
            <Button label="Enregistrer" onPress={savePseudo} loading={pseudoSaving} disabled={!cleanPseudo} />
          </View>
        </BottomSheet>
      ) : null}

      {mounted === 'password' ? (
        <BottomSheet open={sheet === 'password'} onRequestClose={close} onClosed={unmount}>
          <View style={styles.sheet}>
            <AppText variant="title3" accessibilityRole="header">
              Mot de passe
            </AppText>
            <AppText variant="callout" tone="subtitle">
              {FORGOT_PASSWORD_ENABLED
                ? `Je t’envoie un lien à ${user?.email ?? 'ton adresse'} pour choisir un nouveau mot de passe.`
                : 'Pour choisir un nouveau mot de passe, passe par le site : tu y reçois un lien par e-mail.'}
            </AppText>
            {resetSent ? (
              <AppText variant="callout" tone="success" accessibilityRole="alert">
                Si un compte existe avec cette adresse, un lien vient d’être envoyé.
              </AppText>
            ) : null}
            {resetError ? (
              <AppText variant="callout" tone="error" accessibilityRole="alert">
                {resetError}
              </AppText>
            ) : null}
            <Button label={FORGOT_PASSWORD_ENABLED ? 'Recevoir le lien' : 'Ouvrir le site'} onPress={sendReset} disabled={resetSent} />
          </View>
        </BottomSheet>
      ) : null}

      {mounted === 'delete' ? (
        <BottomSheet open={sheet === 'delete'} onRequestClose={close} onClosed={unmount}>
          <View style={styles.sheet}>
            <AppText variant="title3" accessibilityRole="header">
              Supprimer ton compte
            </AppText>
            <AppText variant="callout" tone="subtitle">
              Ton compte est désactivé tout de suite, et ce que l’app garde sur ce téléphone est effacé. Il est supprimé
              définitivement au bout de 30 jours ; pour le réactiver avant, écris à contact@valtheria.fr.
            </AppText>
            <TextField
              label="Ton mot de passe"
              value={deletePassword}
              onChangeText={(t) => {
                setDeletePassword(t);
                setDeleteError(null);
              }}
              secret
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="password"
              autoComplete="current-password"
              returnKeyType="done"
              onSubmitEditing={() => {
                if (deletePassword) confirmDelete();
              }}
              error={deleteError}
            />
            <Button variant="danger" label="Supprimer mon compte" onPress={confirmDelete} disabled={!deletePassword} loading={deleting} />
            <Button variant="text" label="Annuler" onPress={close} />
          </View>
        </BottomSheet>
      ) : null}

      {mounted === 'objective' ? (
        <ObjectiveSheet
          open={sheet === 'objective'}
          current={p.objective}
          universes={p.universes}
          onPick={pickObjective}
          onRequestClose={close}
          onClosed={unmount}
        />
      ) : null}

      {mounted === 'legal' ? (
        <BottomSheet open={sheet === 'legal'} onRequestClose={close} onClosed={unmount}>
          <View style={styles.sheet}>
            <AppText variant="title3" accessibilityRole="header">
              Confidentialité et conditions
            </AppText>
            <Button variant="secondary" label="Politique de confidentialité" onPress={() => WebBrowser.openBrowserAsync(PRIVACY_URL).catch(() => {})} />
            <Button variant="secondary" label="Conditions d’utilisation" onPress={() => WebBrowser.openBrowserAsync(TERMS_URL).catch(() => {})} />
            <Button variant="secondary" label="Mentions légales" onPress={() => WebBrowser.openBrowserAsync(LEGAL_NOTICE_URL).catch(() => {})} />
          </View>
        </BottomSheet>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space[4],
    minHeight: 48,
  },
  barTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 17,
  },
  barSpacer: {
    width: size.tapMin,
  },
  content: {
    paddingHorizontal: space[5],
    paddingTop: space[2],
    paddingBottom: space[6],
    gap: space[5],
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3] + 2,
    paddingVertical: space[3] + 2,
    paddingHorizontal: space[4],
    borderRadius: radius.card,
    borderCurve: 'continuous',
  },
  identityName: {
    flex: 1,
    fontFamily: fonts.bodyBold,
    fontSize: 17,
  },
  version: {
    textAlign: 'center',
  },
  sheet: {
    gap: space[4],
    paddingHorizontal: space[5],
    paddingBottom: space[2],
  },
});
