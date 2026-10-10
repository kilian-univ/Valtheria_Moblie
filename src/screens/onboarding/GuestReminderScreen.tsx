import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AppText from '@/src/components/common/AppText';
import Button from '@/src/components/common/Button';
import ValBubble from '@/src/components/common/ValBubble';
import ReminderPicker from '@/src/components/onboarding/ReminderPicker';
import ReminderPromise from '@/src/components/onboarding/ReminderPromise';
import StepHeader from '@/src/components/onboarding/StepHeader';
import { space } from '@/src/constants/style/Style';
import { onboardingStore } from '@/src/state/onboarding';
import { enableReminder } from '@/src/state/reminder';
import { DEFAULT_REMINDER, ReminderTime } from '@/src/utils/reminder';
import { track } from '@/src/utils/track';

const VAL_DIAMETER = 64;

// Rappel sans compte (inscription fermée, « Me rappeler demain » en fin de
// leçon) : le même choix que dans l'inscription, en notification locale,
// puis l'accueil sans compte
export default function GuestReminderScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [time, setTime] = useState<ReminderTime>(DEFAULT_REMINDER);
  const [submitting, setSubmitting] = useState(false);
  const [refused, setRefused] = useState(false);

  // L'accueil sans compte ; le parcours ne revient plus
  const home = () => {
    if (onboardingStore.get().state.status === 'en-cours') onboardingStore.update({ status: 'plus-tard' });
    router.replace('/apprendre');
  };

  const activate = async () => {
    setSubmitting(true);
    const granted = await enableReminder(time);
    setSubmitting(false);
    if (!granted) {
      setRefused(true);
      return;
    }
    track('rappel_active_sans_compte', { heure: time.hour, minute: time.minute });
    home();
  };

  const back = () => {
    if (router.canGoBack()) router.back();
    else home();
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <StepHeader onBack={back} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <ValBubble mood="determine" diameter={VAL_DIAMETER} text="Le secret, c’est la régularité. Je te fais signe chaque jour ?" />
        <AppText variant="title2" accessibilityRole="header" style={styles.title}>
          Quand veux-tu qu’on se retrouve ?
        </AppText>
        <ReminderPicker value={time} onChange={setTime} />
        <ReminderPromise />
        {refused ? (
          <AppText variant="callout" tone="subtitle" accessibilityRole="alert">
            Les notifications sont coupées pour Valtheria. Tu peux les autoriser dans les réglages du téléphone, puis
            réessayer.
          </AppText>
        ) : null}
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: insets.bottom + space[3] }]}>
        <Button label="Activer mon rappel" onPress={activate} loading={submitting} />
        <Button variant="text" label="Pas maintenant" onPress={home} />
      </View>
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
  footer: {
    paddingHorizontal: space[5],
    paddingTop: space[3],
    gap: space[2],
  },
});
