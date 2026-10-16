import { useRouter } from 'expo-router';
import { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import GuestState from '@/src/components/apprendre/home/GuestState';
import { ModuleRowsSkeleton } from '@/src/components/apprendre/home/HomeSkeleton';
import { StatusBarShade } from '@/src/components/common/AppBackground';
import AppText from '@/src/components/common/AppText';
import BackButton from '@/src/components/common/BackButton';
import ListRow from '@/src/components/common/ListRow';
import PageState from '@/src/components/common/PageState';
import { SkeletonGroup } from '@/src/components/common/Skeleton';
import { StaggerItem } from '@/src/components/common/Stagger';
import UniverseArt from '@/src/components/common/UniverseArt';
import { moduleColors, space } from '@/src/constants/style/Style';
import { loadErrorMessage, OFFLINE_BANNER, useLearningData } from '@/src/hooks/useLearningData';
import { universePill } from '@/src/utils/levels';
import { universeColorKey } from '@/src/utils/modulePath';
import { groupByFamily, modulesProgressLabel, universeEntry } from '@/src/utils/universes';

const ART = 52;

// Tous les univers, rangés par famille (Investir, Gagner de l'argent, Gérer
// au quotidien, Comprendre l'économie). Un univers sans module publié est
// affiché, estompé, « Bientôt disponible ».
export default function UniversesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const data = useLearningData();
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/apprendre'));

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
    body = <PageState variant="error" title="Univers indisponibles" message={loadErrorMessage(data.error)} onRetry={data.reload} />;
  } else {
    const groups = groupByFamily(data.universes.map((u) => universeEntry(u, data.modules)));
    body = (
      <>
        {data.offline ? <PageState variant="offline" text={OFFLINE_BANNER} style={styles.offline} /> : null}
        {groups.map((group, g) => (
          <StaggerItem key={group.title} index={g}>
            <AppText variant="sectionLabel" accessibilityRole="header" style={styles.family}>
              {group.title}
            </AppText>
            <View style={styles.rows}>
              {group.entries.map((entry, i) => {
                const color = moduleColors[universeColorKey(entry.universe)].face;
                const empty = entry.modules.length === 0;
                const art = <UniverseArt slug={entry.universe.slug} color={color} size={ART} framed />;
                const last = i === group.entries.length - 1;
                return empty ? (
                  <ListRow
                    key={entry.universe.id}
                    serif
                    title={entry.universe.name}
                    leading={art}
                    last={last}
                    locked
                    lockedReason="Bientôt disponible"
                  />
                ) : (
                  <ListRow
                    key={entry.universe.id}
                    serif
                    title={entry.universe.name}
                    subtitle={`${universePill(entry.modules).label} · ${
                      entry.done > 0
                        ? modulesProgressLabel(entry.done, entry.modules.length)
                        : `${entry.modules.length} ${entry.modules.length >= 2 ? 'modules' : 'module'}`
                    }`}
                    leading={art}
                    showChevron
                    last={last}
                    onPress={() =>
                      router.push({ pathname: '/apprendre/univers/[universeId]', params: { universeId: entry.universe.id } })
                    }
                  />
                );
              })}
            </View>
          </StaggerItem>
        ))}
      </>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingTop: insets.top + space[2] }]}>
        <View style={styles.topRow}>
          <BackButton onBack={goBack} />
        </View>
        <AppText variant="title1" accessibilityRole="header" style={styles.title}>
          Tous les univers
        </AppText>
        {body}
      </ScrollView>
      <StatusBarShade tab="apprendre" />
    </View>
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
    marginBottom: space[2],
  },
  title: {
    marginBottom: space[2],
  },
  offline: {
    marginVertical: space[4],
    marginHorizontal: -space[5],
  },
  family: {
    marginTop: space[6],
    marginBottom: space[1],
  },
  rows: {
    marginHorizontal: -space[4],
  },
});
