import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState, useSyncExternalStore } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';

import ContinueCard from '@/src/components/apprendre/lesson-path/ContinueCard';
import LessonNode from '@/src/components/apprendre/lesson-path/LessonNode';
import ModuleCard from '@/src/components/apprendre/lesson-path/ModuleCard';
import PathBackground, { getNodePosition, NODE_SPACING_Y, PATH_WIDTH } from '@/src/components/apprendre/lesson-path/PathBackground';
import Header from '@/src/components/topbar/header';
import { getApprendreStyles, palette } from '@/src/constants/style/Style';
import { Lesson, useApi } from '@/src/context/ApiContext';
import { useTheme } from '@/src/context/ThemeContext';
import { learningStore } from '@/src/state/learningStore';

type LessonStatus = 'completed' | 'available' | 'locked';

function withStatus(lessons: Lesson[]): (Lesson & { status: LessonStatus })[] {
  let foundAvailable = false;
  return lessons.map((lesson) => {
    if (lesson.completed) return { ...lesson, status: 'completed' as const };
    if (!foundAvailable) {
      foundAvailable = true;
      return { ...lesson, status: 'available' as const };
    }
    return { ...lesson, status: 'locked' as const };
  });
}

export default function LearnScreen() {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const styles = getApprendreStyles(colorScheme);
  const { getModules, getProgress, startLesson, getLesson, isLoading: apiLoading, isAuthenticated } = useApi();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startingLessonId, setStartingLessonId] = useState<number | null>(null);
  const { modules, streak, xp } = useSyncExternalStore(learningStore.subscribe, learningStore.getState);

  useFocusEffect(
    useCallback(() => {
      if (apiLoading) return;
      if (!isAuthenticated) {
        setError('Tu dois être connecté pour accéder à cette page.');
        setIsLoading(false);
        return;
      }
      Promise.all([getModules(), getProgress()])
        .then(([modulesData, progressData]) => {
          learningStore.setState({
            modules: modulesData,
            streak: progressData?.streak ?? 0,
            xp: progressData?.xp ?? 0,
          });
          setError(null);
        })
        .catch((err: any) => setError(err.message || 'Impossible de charger les leçons.'))
        .finally(() => setIsLoading(false));
    }, [apiLoading, isAuthenticated])
  );


  const modulesWithStatus = useMemo(
    () => modules.map((mod) => ({ ...mod, lessons: withStatus(mod.lessons) })),
    [modules]
  );

  const current = useMemo(() => {
    for (const mod of modulesWithStatus) {
      const found = mod.lessons.find((l) => l.status === 'available');
      if (found) return { lesson: found, module: mod };
    }
    return null;
  }, [modulesWithStatus]);

  const handlePressLesson = async (lesson: Lesson & { status: LessonStatus }) => {
    if (lesson.status === 'locked' || startingLessonId !== null) return;
    setStartingLessonId(lesson.id);
    try {
      if (lesson.status === 'available') {
        await startLesson(lesson.id);
      }
      router.push(`/apprendre/${lesson.id}`);
    } catch (err: any) {
      setError(err.message || 'Impossible de démarrer la leçon.');
    } finally {
      setStartingLessonId(null);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.screen}>
        <Header showBack={false} />
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Header showBack={false} />

      <View style={styles.headerWrap}>
        <LinearGradient
          colors={[colors.primary, colors.background]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1.4 }}
          style={styles.headerGradient}
        >
          <View style={styles.headerDecoCircleGold} />
          <View style={styles.headerDecoCircleBg} />

          <View style={styles.headerStatsRow}>
            <StatPill icon="🔥" value={streak} label="jours" colors={colors} styles={styles} />
            <StatPill icon="⭐" value={xp} label="XP" colors={colors} styles={styles} accent="gold" />
          </View>
        </LinearGradient>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {current && (
          <ContinueCard
            lessonTitle={current.lesson.title}
            moduleTitle={current.module.title}
            xpReward={current.lesson.xp_reward}
            colors={colors}
            styles={styles}
            onPress={() => handlePressLesson(current.lesson)}
          />
        )}

        {modulesWithStatus.map((mod) => {
          const total = mod.lessons_count;
          const completed = mod.lessons_completed;
          const pathHeight = mod.lessons.length > 0 ? (mod.lessons.length - 1) * NODE_SPACING_Y + 100 : 0;

          return (
            <View key={mod.id} style={styles.moduleBlock}>
              <ModuleCard
                icon={mod.icon}
                title={mod.title}
                completed={completed}
                total={total}
                color={mod.color}
                difficulty={mod.difficulty}
                colors={colors}
                styles={styles}
              />

              <View style={[styles.pathWrap, { width: PATH_WIDTH, height: pathHeight }]}>
                <PathBackground
                  totalCount={mod.lessons.length}
                  completedCount={completed}
                  colors={colors}
                  moduleColor={mod.color}
                />
                {mod.lessons.map((lesson, index) => {
                  const { x, y } = getNodePosition(index);
                  const isCurrent = lesson.id === current?.lesson.id;
                  return (
                    <LessonNode
                      key={lesson.id}
                      lesson={lesson}
                      x={x}
                      y={y}
                      isCurrent={isCurrent}
                      colors={colors}
                      styles={styles}
                      moduleColor={mod.color}
                      isStarting={startingLessonId === lesson.id}
                      onPress={() => handlePressLesson(lesson)}
                    />
                  );
                })}
              </View>
            </View>
          );
        })}

        {modules.length === 0 && !error && (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>De nouveaux contenus arrivent bientôt sur cette page.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function StatPill({
  icon,
  value,
  label,
  colors,
  styles,
  accent,
}: {
  icon: string;
  value: number;
  label: string;
  colors: any;
  styles: any;
  accent?: 'gold';
}) {
  return (
    <View style={styles.statPill}>
      <Text style={styles.statPillIcon}>{icon}</Text>
      <Text style={accent === 'gold' ? styles.statPillValueGold : styles.statPillValue}>{value}</Text>
      <Text style={styles.statPillLabel}>{label}</Text>
    </View>
  );
}