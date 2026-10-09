import { useLocalSearchParams, useRouter } from 'expo-router';
import { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import GuestState from '@/src/components/apprendre/home/GuestState';
import { ModuleRowsSkeleton } from '@/src/components/apprendre/home/HomeSkeleton';
import ModuleRow from '@/src/components/apprendre/home/ModuleRow';
import { BackButton } from '@/src/components/apprendre/module/ModuleHeader';
import AppText from '@/src/components/common/AppText';
import PageState from '@/src/components/common/PageState';
import ProgressRing from '@/src/components/common/ProgressRing';
import { SkeletonGroup } from '@/src/components/common/Skeleton';
import { StaggerItem } from '@/src/components/common/Stagger';
import { space } from '@/src/constants/style/Style';
import { Module } from '@/src/context/ApiContext';
import { loadErrorMessage, OFFLINE_BANNER, useLearningData } from '@/src/hooks/useLearningData';
import { findUniverse, modulesProgressLabel, universeEntry } from '@/src/utils/universes';

const RING = 44;
const RING_STROKE = 4;

// Page d'un univers (pile de l'onglet Apprendre, barre d'onglets visible) :
// nom, description, progression, puis ses modules
export default function UniverseScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { universeId } = useLocalSearchParams<{ universeId: string }>();
  const id = Number(universeId);

  const data = useLearningData();
  const universe = findUniverse(data.universes, Number.isFinite(id) ? id : null);
  const entry = universe ? universeEntry(universe, data.modules) : null;

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/apprendre'));
  const openModule = (module: Module) =>
    router.push({ pathname: '/apprendre/module/[moduleId]', params: { moduleId: module.id } });

  let body: ReactNode;
  if (!data.isAuthenticated && !data.authPending) {
    body = <GuestState onRegister={() => router.push('/client/register')} onLogin={() => router.push('/client/login')} />;
  } else if (data.isLoading) {
    body = (
      <SkeletonGroup>
        <ModuleRowsSkeleton />
      </SkeletonGroup>
    );
  } else if (data.error) {
    body = <PageState variant="error" title="Leçons indisponibles" message={loadErrorMessage(data.error)} onRetry={data.reload} />;
  } else if (!entry || entry.modules.length === 0) {
    body = (
      <PageState
        variant="error"
        title="Univers introuvable"
        message="Cet univers n'est plus disponible."
        retryLabel="Retour aux modules"
        onRetry={() => router.replace('/apprendre')}
      />
    );
  } else {
    const total = entry.modules.length;
    body = (
      <>
        {data.offline ? <PageState variant="offline" text={OFFLINE_BANNER} style={styles.offline} /> : null}

        <StaggerItem index={0}>
          <AppText variant="sectionLabel" style={styles.label}>
            Univers
          </AppText>
          <AppText variant="title1" accessibilityRole="header">
            {entry.universe.name}
          </AppText>
          {entry.universe.description ? (
            <AppText variant="body" tone="subtitle" style={styles.description}>
              {entry.universe.description}
            </AppText>
          ) : null}

          <View style={styles.progress}>
            <ProgressRing
              diameter={RING}
              stroke={RING_STROKE}
              progress={entry.progress}
              done={entry.done === total}
              // Espace fine insécable avant % : à la française
              label={entry.progress > 0 && entry.done < total ? `${Math.round(entry.progress * 100)} %` : undefined}
            />
            <AppText variant="bodyMedium" style={styles.progressText}>
              {modulesProgressLabel(entry.done, total)}
            </AppText>
          </View>
        </StaggerItem>

        <StaggerItem index={1}>
          <View style={styles.rows}>
            {entry.modules.map((module, i) => (
              <ModuleRow key={module.id} module={module} last={i === total - 1} onPress={() => openModule(module)} />
            ))}
          </View>
        </StaggerItem>
      </>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingTop: insets.top + space[2] }]}>
      <View style={styles.topRow}>
        <BackButton onBack={goBack} />
      </View>
      {body}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingHorizontal: space[5],
    paddingBottom: space[10],
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: space[4],
  },
  offline: {
    marginBottom: space[4],
    marginHorizontal: -space[5],
  },
  label: {
    marginBottom: space[2],
  },
  description: {
    marginTop: space[2],
  },
  progress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    marginTop: space[5],
    marginBottom: space[4],
  },
  progressText: {
    flex: 1,
  },
  // Lignes pleine largeur, comme sur l'accueil
  rows: {
    marginHorizontal: -space[4],
  },
});
