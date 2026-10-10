import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import AppText from '@/src/components/common/AppText';
import { palette, radius, space } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';

// Promesse sous le choix du rappel (inscription, rappel sans compte)
export default function ReminderPromise() {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  return (
    <View style={[styles.promise, { backgroundColor: colors.surface }]}>
      <Ionicons name="notifications-outline" size={22} color={colors.gold} />
      <AppText variant="callout" tone="subtitle" style={styles.promiseText}>
        Un seul rappel par jour, jamais plus. Tu peux le couper à tout moment dans ton profil.
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  promise: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space[3] - 2,
    padding: space[4] - 2,
    borderRadius: radius.option,
  },
  promiseText: {
    flex: 1,
  },
});
