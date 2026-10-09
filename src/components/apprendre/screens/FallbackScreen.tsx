import { StyleSheet, View } from 'react-native';

import AppText from '@/src/components/common/AppText';
import { palette, radius, space } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import type { UnsupportedScreen } from '@/src/lesson/model';
import ScreenIntro from '../player/ScreenIntro';
import { LessonScreenProps } from '../types';

// Types d'écran pas encore construits (number, dialogue, allocate,
// live_month) : contenu brut, lisible et non bloquant (« Continuer »).
export default function FallbackScreen({ screen }: LessonScreenProps<UnsupportedScreen>) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];

  return (
    <View style={styles.wrap}>
      <ScreenIntro screen={screen} />
      <View style={[styles.box, { backgroundColor: colors.surface }]}>
        <AppText variant="caption" tone="subtitle">
          Type d’écran pas encore géré : « {screen.type} »
        </AppText>
        <AppText variant="caption" style={styles.code}>
          {JSON.stringify(screen.payload, null, 2)}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: space[6],
  },
  box: {
    padding: space[4],
    borderRadius: radius.md,
    gap: space[2],
  },
  code: {
    fontVariant: ['tabular-nums'],
  },
});
