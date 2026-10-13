import { useRouter } from 'expo-router';
import { ComponentProps, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import ReliefOption from '@/src/components/apprendre/player/ReliefOption';
import Button from '@/src/components/common/Button';
import { ValBeside } from '@/src/components/common/ValBubble';
import ValFullBody, { VAL_FACES, valPose } from '@/src/components/common/ValFullBody';
import StepHeader from '@/src/components/onboarding/StepHeader';
import { space } from '@/src/constants/style/Style';
import { DISCOVERY, OBJECTIVE_OPTIONS, Objective } from '@/src/lesson/discovery';
import { onboardingStore, useOnboarding } from '@/src/state/onboarding';
import { objectiveValLine } from '@/src/utils/discoveryHome';
import { select } from '@/src/utils/haptics';
import { track } from '@/src/utils/track';
import { universeTint } from '@/src/utils/universeTint';

type IconName = ComponentProps<typeof Ionicons>['name'];

const VAL_WIDTH = 72;
const VAL_HEIGHT = Math.round(VAL_WIDTH / valPose('salut').ratio);

// Objectif (étape 2 sur 2) : Val, prénom compris, demande ce qui t'amène ;
// six objectifs à la couleur de leur univers, « C'est parti » dès qu'un est
// choisi
export default function ObjectiveScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state } = useOnboarding();
  const [choice, setChoice] = useState<Objective | null>(state.objective);
  const valLine = objectiveValLine(state.firstName);

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
    onboardingStore.update({ step: 'prenom' });
    if (router.canGoBack()) router.back();
    else router.replace('/bienvenue/prenom');
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <StepHeader onBack={back} step={2} total={2} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View accessibilityRole="header">
          <ValBeside
            figure={<ValFullBody pose="salut" width={VAL_WIDTH} height={0} />}
            width={VAL_WIDTH}
            height={VAL_HEIGHT}
            face={VAL_FACES.salut}
            text={valLine}
          />
        </View>
        <View style={styles.options} accessibilityRole="radiogroup">
          {OBJECTIVE_OPTIONS.map((o) => {
            const tint = universeTint(DISCOVERY[o.value].universe.slug);
            return (
              <ReliefOption
                key={o.value}
                label={o.label}
                icon={o.icon as IconName}
                badge={{ color: tint.face, iconColor: tint.onFace }}
                state={choice === o.value ? 'selected' : 'idle'}
                selected={choice === o.value}
                onPress={() => pick(o.value)}
              />
            );
          })}
        </View>
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: insets.bottom + space[3] }]}>
        <Button
          label="C’est parti"
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
  options: {
    gap: space[3] - 3,
    marginTop: space[5],
  },
  footer: {
    paddingHorizontal: space[5],
    paddingTop: space[3],
  },
});
