import { useRouter } from 'expo-router';
import { ComponentProps, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import ReliefOption from '@/src/components/apprendre/player/ReliefOption';
import AppText from '@/src/components/common/AppText';
import Button from '@/src/components/common/Button';
import StepHeader from '@/src/components/onboarding/StepHeader';
import { space } from '@/src/constants/style/Style';
import { OBJECTIVE_OPTIONS, Objective } from '@/src/lesson/discovery';
import { onboardingStore, useOnboarding } from '@/src/state/onboarding';
import { select } from '@/src/utils/haptics';
import { track } from '@/src/utils/track';

type IconName = ComponentProps<typeof Ionicons>['name'];

// « Qu'est-ce qui t'amène ? » : six objectifs, Continuer dès qu'un est choisi
export default function ObjectiveScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state } = useOnboarding();
  const [choice, setChoice] = useState<Objective | null>(state.objective);

  const pick = (value: Objective) => {
    select();
    setChoice(value);
  };

  const next = () => {
    if (!choice) return;
    track('objectif_choisi', { objectif: choice });
    onboardingStore.update({ objective: choice, step: 'lecon' });
    router.push('/bienvenue/lecon');
  };

  const back = () => {
    onboardingStore.update({ step: 'bienvenue' });
    if (router.canGoBack()) router.back();
    else router.replace('/bienvenue');
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <StepHeader onBack={back} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <AppText variant="title2" accessibilityRole="header">
          Qu’est-ce qui t’amène ?
        </AppText>
        <AppText variant="callout" tone="subtitle" style={styles.subtitle}>
          Val adapte ton parcours. Tu pourras changer plus tard.
        </AppText>
        <View style={styles.options} accessibilityRole="radiogroup">
          {OBJECTIVE_OPTIONS.map((o) => (
            <ReliefOption
              key={o.value}
              label={o.label}
              icon={o.icon as IconName}
              state={choice === o.value ? 'selected' : 'idle'}
              selected={choice === o.value}
              onPress={() => pick(o.value)}
            />
          ))}
        </View>
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: insets.bottom + space[3] }]}>
        <Button
          label="Continuer"
          onPress={next}
          disabled={!choice}
          disabledReason={!choice ? 'Choisis ce qui t’amène pour continuer.' : undefined}
        />
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
  },
  subtitle: {
    marginTop: space[2],
  },
  options: {
    gap: space[3] - 3,
    marginTop: space[5],
  },
  footer: {
    paddingHorizontal: space[5],
    paddingTop: space[3],
  },
});
