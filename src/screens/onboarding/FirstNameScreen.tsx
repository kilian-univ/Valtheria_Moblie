import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Button from '@/src/components/common/Button';
import TextField from '@/src/components/common/TextField';
import { ValBeside } from '@/src/components/common/ValBubble';
import ValFullBody, { VAL_FACES, valPose } from '@/src/components/common/ValFullBody';
import StepHeader from '@/src/components/onboarding/StepHeader';
import { space } from '@/src/constants/style/Style';
import { onboardingStore, useOnboarding } from '@/src/state/onboarding';
import { cleanFirstName, FIRST_NAME_MAX } from '@/src/utils/onboarding';
import { track } from '@/src/utils/track';

const VAL_WIDTH = 96;
const VAL_HEIGHT = Math.round(VAL_WIDTH / valPose('salut').ratio);
// Val s'est présenté sur la bienvenue : ici, il ne demande que le prénom
const VAL_LINE = 'Et toi, comment je t’appelle ?';

// Prénom (étape 1 sur 2) : Val demande comment t'appeler. Gardé sur le
// téléphone ; « Passer » toujours possible.
export default function FirstNameScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state } = useOnboarding();
  const [name, setName] = useState(state.firstName);
  const clean = cleanFirstName(name);

  const goOn = (firstName: string) => {
    onboardingStore.update({ firstName, step: 'objectif' });
    router.push('/bienvenue/objectif');
  };

  const submit = () => {
    if (!clean) return;
    track('prenom_saisi');
    goOn(clean);
  };

  const skip = () => {
    track('prenom_passe');
    goOn('');
  };

  const back = () => {
    onboardingStore.update({ step: 'bienvenue' });
    if (router.canGoBack()) router.back();
    else router.replace('/bienvenue');
  };

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <StepHeader onBack={back} step={1} total={2} />
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View accessibilityRole="header">
          <ValBeside
            figure={<ValFullBody pose="salut" width={VAL_WIDTH} height={0} />}
            width={VAL_WIDTH}
            height={VAL_HEIGHT}
            face={VAL_FACES.salut}
            text={VAL_LINE}
          />
        </View>
        <TextField
          label="Ton prénom"
          value={name}
          onChangeText={setName}
          autoFocus
          autoCapitalize="words"
          autoCorrect={false}
          textContentType="givenName"
          autoComplete="given-name"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={submit}
          maxLength={FIRST_NAME_MAX}
          hint="Il reste sur ton téléphone."
        />
      </ScrollView>
      {/* Boutons toujours visibles, au-dessus du clavier */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + space[3] }]}>
        <Button
          label="Continuer"
          onPress={submit}
          disabled={!clean}
        />
        <Button variant="text" label="Passer" onPress={skip} />
      </View>
    </KeyboardAvoidingView>
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
    paddingTop: space[10],
    paddingBottom: space[6],
    gap: space[6],
  },
  footer: {
    paddingHorizontal: space[5],
    paddingTop: space[3],
    gap: space[1],
  },
});
