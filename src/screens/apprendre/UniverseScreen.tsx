import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ReactNode, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import GuestState from '@/src/components/apprendre/home/GuestState';
import { ModuleRowsSkeleton } from '@/src/components/apprendre/home/HomeSkeleton';
import LevelTabs from '@/src/components/apprendre/universe/LevelTabs';
import ModuleLine from '@/src/components/apprendre/universe/ModuleLine';
import BackButton from '@/src/components/common/BackButton';
import { StatusBarShade } from '@/src/components/common/AppBackground';
import AppText from '@/src/components/common/AppText';
import GoldHalo from '@/src/components/common/GoldHalo';
import PageState from '@/src/components/common/PageState';
import { SkeletonGroup } from '@/src/components/common/Skeleton';
import { StaggerItem } from '@/src/components/common/Stagger';
import UniverseArt from '@/src/components/common/UniverseArt';
import ValBubble from '@/src/components/common/ValBubble';
import { fonts, moduleColors, palette, size, space, titleLetterSpacing, withOpacity } from '@/src/constants/style/Style';
import { Module, useApi } from '@/src/context/ApiContext';
import { useTheme } from '@/src/context/ThemeContext';
import { loadErrorMessage, OFFLINE_BANNER, useLearningData } from '@/src/hooks/useLearningData';
import { useLearningLog } from '@/src/state/learningLog';
import { markUniverseSeen, useSeenUniverses } from '@/src/state/seenUniverses';
import { userKeyOf } from '@/src/state/userMemory';
import { lastActivityByModule } from '@/src/utils/dailyProgram';
import { select, warning } from '@/src/utils/haptics';
import {
  currentLevelIndex,
  doneModulesLabel,
  type LevelGroup,
  levelGroups,
  levelIntro,
  lockedMessage,
  sortLevelModules,
} from '@/src/utils/levels';
import { universeColorKey } from '@/src/utils/modulePath';
import { findUniverse, universeEntry, universeIntro } from '@/src/utils/universes';

const ART = 96;
const NAME_SIZE = 26;
const HALO = 360;
const HALO_OPACITY = 0.22;
const VAL_DIAMETER = 56;

// Page d'un univers (pile de l'onglet Apprendre, barre d'onglets visible) :
// en-tête sur un halo de sa couleur, Val à la première visite, sélecteur de
// niveaux, puis les modules du niveau (en cours, pas commencés, et les
// terminés regroupés en bas). `niveau` : niveau ouvert à l'arrivée (« Choisir
// mon prochain module » depuis un module).
export default function UniverseScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const { user } = useApi();
  const { universeId, niveau } = useLocalSearchParams<{ universeId: string; niveau?: string }>();
  const id = Number(universeId);

  const data = useLearningData();
  const universe = findUniverse(data.universes, Number.isFinite(id) ? id : null);
  const entry = universe ? universeEntry(universe, data.modules) : null;
  const color = universe ? moduleColors[universeColorKey(universe)].face : colors.gold;

  // Première visite : Val présente l'univers (une seule fois)
  const key = userKeyOf(user?.id);
  const seen = useSeenUniverses(key);
  const [firstVisit, setFirstVisit] = useState<boolean | null>(null);
  const slug = universe?.slug ?? null;
  if (firstVisit === null && seen !== null && slug !== null) setFirstVisit(!seen.includes(slug));
  useEffect(() => {
    if (firstVisit && slug && user) markUniverseSeen(key, slug);
  }, [firstVisit, slug, key, user]);

  const log = useLearningLog(key);
  const activity = lastActivityByModule(log ?? []);

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
        retryLabel="Retour aux univers"
        onRetry={() => router.replace('/apprendre')}
      />
    );
  } else {
    body = (
      <>
        {data.offline ? <PageState variant="offline" text={OFFLINE_BANNER} style={styles.offline} /> : null}

        <StaggerItem index={0}>
          <View style={styles.head}>
            <UniverseArt slug={entry.universe.slug} color={color} size={ART} framed />
            <View style={styles.headTexts}>
              <AppText maxFontSizeMultiplier={1.3} style={styles.name} accessibilityRole="header">
                {entry.universe.name}
              </AppText>
              {entry.universe.description ? (
                <AppText variant="caption" tone="subtitle" style={styles.description}>
                  {entry.universe.description}
                </AppText>
              ) : null}
            </View>
          </View>
          {firstVisit ? (
            <View style={styles.val}>
              <ValBubble mood="complice" diameter={VAL_DIAMETER} text={universeIntro(entry.universe.slug, entry.universe.description)} />
            </View>
          ) : null}
        </StaggerItem>

        <StaggerItem index={1}>
          <Levels
            groups={levelGroups(entry.modules)}
            initialKey={typeof niveau === 'string' ? niveau : null}
            color={color}
            lastActivity={(mid) => activity.get(mid) ?? null}
            onOpen={openModule}
          />
        </StaggerItem>
      </>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingTop: insets.top + space[2] }]}>
        {/* Halo de la couleur de l'univers derrière l'en-tête */}
        {entry ? (
          <View style={styles.halo} pointerEvents="none">
            <GoldHalo color={withOpacity(color, HALO_OPACITY)} />
          </View>
        ) : null}
        <View style={styles.topRow}>
          <BackButton onBack={goBack} />
        </View>
        {body}
      </ScrollView>
      {/* Rien ne passe sous la barre d'état en défilant */}
      <StatusBarShade tab="apprendre" />
    </View>
  );
}

// Sélecteur de niveaux (s'il y en a) et modules du niveau choisi
function Levels({
  groups,
  initialKey,
  color,
  lastActivity,
  onOpen,
}: {
  groups: LevelGroup[];
  initialKey: string | null;
  color: string;
  lastActivity: (moduleId: number) => string | null;
  onOpen: (module: Module) => void;
}) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const [selected, setSelected] = useState(() => {
    const asked = groups.findIndex((g) => g.key !== null && g.key === initialKey);
    return asked >= 0 && groups[asked].unlocked ? asked : currentLevelIndex(groups);
  });
  const [showDone, setShowDone] = useState(false);
  const [blocked, setBlocked] = useState<string | null>(null);

  const group = groups[Math.min(selected, groups.length - 1)];
  if (!group) return null;
  const withLevels = group.key !== null;
  const { active, done } = sortLevelModules(group.modules, lastActivity);

  const choose = (index: number) => {
    const message = lockedMessage(groups, index);
    if (message) {
      warning();
      setBlocked(message);
      return;
    }
    select();
    setBlocked(null);
    setShowDone(false);
    setSelected(index);
  };

  return (
    <View>
      {withLevels ? (
        <View style={styles.tabs}>
          <LevelTabs groups={groups} selected={selected} onSelect={choose} />
          {blocked ? (
            <View style={styles.blocked} accessibilityRole="alert" accessibilityLiveRegion="polite">
              <Ionicons name="lock-closed-outline" size={14} color={colors.subtitle} />
              <AppText variant="caption" tone="subtitle" style={styles.blockedText}>
                {blocked}
              </AppText>
            </View>
          ) : null}
        </View>
      ) : (
        <AppText variant="sectionLabel" accessibilityRole="header" style={styles.allLabel}>
          {group.label}
        </AppText>
      )}

      <AppText variant="caption" tone="subtitle" style={styles.intro}>
        {levelIntro(group.modules.length)}
      </AppText>

      <View style={styles.rows}>
        {active.map((m, i) => (
          <ModuleLine
            key={m.id}
            module={m}
            color={color}
            last={i === active.length - 1 && (done.length === 0 || !showDone)}
            onPress={() => onOpen(m)}
          />
        ))}
        {showDone
          ? done.map((m, i) => (
              <ModuleLine key={m.id} module={m} color={color} last={i === done.length - 1} onPress={() => onOpen(m)} />
            ))
          : null}
      </View>

      {done.length > 0 ? (
        <Pressable
          onPress={() => {
            select();
            setShowDone((v) => !v);
          }}
          accessibilityRole="button"
          accessibilityState={{ expanded: showDone }}
          accessibilityLabel={`${doneModulesLabel(done.length, withLevels)}. ${showDone ? 'Masquer' : 'Afficher'}`}
          style={({ pressed }) => [styles.doneRow, pressed && styles.pressed]}
        >
          <Ionicons name="checkmark" size={14} color={colors.gold} />
          <AppText variant="callout" tone="subtitle" style={styles.doneText}>
            {doneModulesLabel(done.length, withLevels)}
          </AppText>
          <AppText variant="callout" tone="subtitle" style={styles.doneAction}>
            {showDone ? 'Masquer' : 'Afficher'}
          </AppText>
        </Pressable>
      ) : null}
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
  halo: {
    position: 'absolute',
    left: -HALO / 3,
    top: -HALO / 4,
    width: HALO,
    height: HALO,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: space[2],
  },
  offline: {
    marginBottom: space[4],
    marginHorizontal: -space[5],
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3] + 2,
  },
  headTexts: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontFamily: fonts.title,
    fontSize: NAME_SIZE,
    lineHeight: 30,
    letterSpacing: titleLetterSpacing(NAME_SIZE),
  },
  description: {
    marginTop: 6,
  },
  val: {
    marginTop: space[4],
  },
  tabs: {
    marginTop: space[5],
    gap: space[2],
  },
  blocked: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: space[1],
  },
  blockedText: {
    flex: 1,
  },
  allLabel: {
    marginTop: space[6],
  },
  intro: {
    marginTop: space[4],
    marginBottom: space[1],
  },
  // Lignes pleine largeur, l'appui s'éclaire jusqu'aux bords
  rows: {
    marginHorizontal: -space[4],
  },
  doneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    minHeight: size.tapMin,
    marginTop: space[1],
  },
  doneText: {
    flex: 1,
    fontFamily: fonts.bodySemibold,
  },
  doneAction: {
    fontFamily: fonts.bodySemibold,
  },
  pressed: {
    opacity: 0.7,
  },
});
