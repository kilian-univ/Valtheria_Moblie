import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AppText from '@/src/components/common/AppText';
import Button from '@/src/components/common/Button';
import { StaggerItem } from '@/src/components/common/Stagger';
import ValFullBody from '@/src/components/common/ValFullBody';
import { palette, radius, space } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { discoveryPlan, nextLessonTitle, toObjective, universeName } from '@/src/lesson/discovery';
import { learningStore } from '@/src/state/learningStore';
import { onboardingStore, useOnboarding } from '@/src/state/onboarding';
import { getReminderSettings } from '@/src/state/reminder';
import { discoveryStreak, endActions, endTitle } from '@/src/utils/discoveryHome';
import { isSignupClosed } from '@/src/utils/onboarding';

const VAL_HEIGHT = 170;
const LOCK = 44;

// Fin de la leçon découverte : Val fier (« Bravo, <prénom> ! »), la série,
// la prochaine leçon (verrouillée tant qu'il n'y a pas de compte). Inscription
// ouverte : créer le compte ; fermée : « Me rappeler demain » (choix du
// rappel), ou « Plus tard » vers l'accueil.
export default function DiscoveryEndScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const { state } = useOnboarding();
  // Jouée depuis l'accueil sans compte : la leçon de la tuile, retour à l'accueil
  const params = useLocalSearchParams<{ objectif?: string; depuis?: string }>();
  const fromHome = params.depuis === 'accueil';
  const plan = discoveryPlan((fromHome ? toObjective(params.objectif) : null) ?? state.objective);
  const closed = isSignupClosed(state.signupClosedAt);
  const streak = Math.max(1, discoveryStreak(state.lessonDays));
  // Rappel déjà actif : pas de « Me rappeler demain »
  const [reminderOn, setReminderOn] = useState(false);
  useEffect(() => {
    let active = true;
    getReminderSettings().then((r) => {
      if (active) setReminderOn(r.enabled);
    });
    return () => {
      active = false;
    };
  }, []);
  const actions = endActions(closed, reminderOn);
  // Sans compte, rien n'est chargé en général : la carte nomme alors l'univers
  const { modules, universes } = useSyncExternalStore(learningStore.subscribe, learningStore.getState);
  const nextTitle = nextLessonTitle(plan, universes, modules) ?? `Première leçon de l’univers ${universeName(plan, universes)}`;

  const signUp = () => {
    if (fromHome) {
      router.push('/client/register');
      return;
    }
    onboardingStore.update({ step: 'pseudo' });
    router.push('/bienvenue/inscription');
  };

  // « Plus tard » : l'accueil sans compte ; le parcours ne revient plus
  const later = () => {
    if (state.status === 'en-cours') onboardingStore.update({ status: 'plus-tard' });
    router.replace('/apprendre');
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + space[6] }]} bounces={false}>
        <ValFullBody pose="fier" height={VAL_HEIGHT} halo />
        <StaggerItem index={0}>
          <AppText variant="title1" accessibilityRole="header" style={styles.center}>
            {endTitle(state.firstName, state.played.length <= 1)}
          </AppText>
        </StaggerItem>
        <StaggerItem index={1}>
          <View style={[styles.streak, { backgroundColor: colors.goldSoft }]}>
            {/* Émoji : exception autorisée par la DA pour la série */}
            <AppText variant="bodyMedium" accessible={false}>
              🔥
            </AppText>
            <AppText variant="bodyMedium" tone="gold">
              {streak === 1 ? 'Jour 1 : ta série commence' : `Jour ${streak} : ta série continue`}
            </AppText>
          </View>
        </StaggerItem>
        <StaggerItem index={2}>
          <View
            style={[styles.next, { backgroundColor: colors.surface, borderColor: colors.controlBorder }]}
            accessible
            accessibilityLabel={`Prochaine leçon, verrouillée : ${nextTitle}`}
          >
            <View style={[styles.lock, { backgroundColor: colors.pathLockedFace }]}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.subtitle} />
            </View>
            <View style={styles.nextTexts}>
              <AppText variant="sectionLabel" tone="subtitle">
                Prochaine leçon
              </AppText>
              <AppText variant="bodyMedium">{nextTitle}</AppText>
            </View>
          </View>
        </StaggerItem>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + space[3] }]}>
        {/* Même règle que l'accueil : inscription fermée, pas de « Créer mon compte » */}
        {actions.kind === 'register' ? (
          <>
            <Button label="Créer mon compte pour continuer" onPress={signUp} />
            <AppText variant="caption" tone="subtitle" style={styles.center}>
              Gratuit. Ta série et ta progression sont gardées.
            </AppText>
            <Button variant="text" label={fromHome ? 'Retour à l’accueil' : 'Plus tard'} onPress={later} />
          </>
        ) : (
          <>
            <AppText variant="caption" tone="subtitle" style={styles.center}>
              Les inscriptions ouvrent très bientôt. Ta progression est gardée sur ton téléphone.
            </AppText>
            {actions.kind === 'reminder' ? (
              <>
                <Button label="Me rappeler demain" onPress={() => router.push('/bienvenue/rappel')} />
                <Button variant="text" label="Plus tard" onPress={later} />
              </>
            ) : (
              <Button label="Retour à l’accueil" onPress={later} />
            )}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: space[5],
    gap: space[4],
  },
  center: {
    textAlign: 'center',
  },
  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    minHeight: 38,
    paddingHorizontal: space[4] - 2,
    borderRadius: radius.pill,
  },
  next: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[4] - 2,
    padding: space[4] - 2,
    borderRadius: radius.md + 4,
    borderWidth: 1,
    marginTop: space[2],
  },
  lock: {
    width: LOCK,
    height: LOCK,
    borderRadius: LOCK / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextTexts: {
    flex: 1,
    gap: 2,
  },
  footer: {
    paddingHorizontal: space[5],
    paddingTop: space[3],
    gap: space[2],
  },
});
