import { useEffect, useRef } from 'react';
import { Animated, Platform, Text, View } from 'react-native';

export default function ModuleCard({
  icon,
  title,
  completed,
  total,
  color,
  difficulty,
  colors,
  styles,
}: {
  icon?: string;
  title: string;
  completed: number;
  total: number;
  color?: string;
  difficulty?: string;
  colors: any;
  styles: any;
}) {
  const ratio = total > 0 ? completed / total : 0;
  const widthAnim = useRef(new Animated.Value(0)).current;
  const accent = color || colors.gold;

  useEffect(() => {
    Animated.timing(widthAnim, { toValue: ratio, duration: 900, useNativeDriver: false }).start();
  }, [ratio]);

  const isDone = ratio === 1;

  return (
    <View
      style={[
        styles.moduleCard,
        isDone ? styles.moduleCardBorderDone : styles.moduleCardBorderActive,
        shadow(isDone ? colors.gold : accent, 0.18, 10),
      ]}
    >
      {/* Bandeau d'accent en haut, coloré selon le module */}
      <View style={[styles.moduleAccentBar, { backgroundColor: isDone ? colors.gold : accent }]} />

      <View style={styles.moduleBody}>
        <View style={styles.moduleHeaderRow}>
          <View style={[styles.moduleIconWrap, { backgroundColor: accent + '26' }, shadow(accent, 0.25, 4)]}>
            <Text style={styles.moduleIconText}>{icon || '📘'}</Text>
          </View>

          <View style={styles.moduleTitleWrap}>
            <Text style={styles.moduleTitleText} numberOfLines={1}>
              {title}
            </Text>
            {difficulty && <Text style={styles.moduleDifficultyText}>{difficulty}</Text>}
          </View>

          {isDone && (
            <View style={styles.moduleDoneBadge}>
              <Text style={styles.moduleDoneBadgeText}>🏆 TERMINÉ</Text>
            </View>
          )}
        </View>

        <View style={styles.moduleProgressRow}>
          <View style={styles.moduleProgressTrack}>
            <Animated.View
              style={[
                styles.moduleProgressFill,
                {
                  backgroundColor: isDone ? colors.gold : accent,
                  width: widthAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                },
              ]}
            />
          </View>
          <Text style={styles.moduleProgressCount}>
            {completed}/{total}
          </Text>
        </View>
      </View>
    </View>
  );
}

function shadow(color: string, opacity: number, radius: number) {
  return Platform.select({
    ios: {
      shadowColor: color,
      shadowOpacity: opacity,
      shadowRadius: radius,
      shadowOffset: { width: 0, height: radius / 2 },
    },
    android: { elevation: radius / 2 },
    default: {},
  });
}