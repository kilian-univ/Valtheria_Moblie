import { useRootNavigationState, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';

import { useApi } from '@/src/context/ApiContext';
import { onboardingStore } from '@/src/state/onboarding';
import { refreshReminder } from '@/src/state/reminder';
import { routeForStep, shouldShowOnboarding } from '@/src/utils/onboarding';
import { track } from '@/src/utils/track';

// Au lancement, une fois la session lue : une personne sans compte dont la
// première ouverture n'est ni terminée ni remise à plus tard est envoyée à
// l'étape où elle en était. Une personne connectée ne voit jamais le parcours.
export default function OnboardingGate() {
  const { isAuthenticated, isLoading } = useApi();
  const router = useRouter();
  const navigation = useRootNavigationState();
  const decided = useRef(false);

  useEffect(() => {
    track('app_ouverte');
    // Rappels des 14 prochains jours, textes renouvelés
    refreshReminder();
  }, []);

  useEffect(() => {
    if (decided.current || !navigation?.key) return;
    // Session encore en lecture et pas de jeton : on attend
    if (isLoading && !isAuthenticated) return;
    decided.current = true;
    onboardingStore.load().then((state) => {
      if (isAuthenticated) {
        if (state.status !== 'termine') onboardingStore.update({ status: 'termine' });
        return;
      }
      if (shouldShowOnboarding(state, false)) router.replace(routeForStep(state.step));
    });
  }, [navigation?.key, isAuthenticated, isLoading, router]);

  return null;
}
