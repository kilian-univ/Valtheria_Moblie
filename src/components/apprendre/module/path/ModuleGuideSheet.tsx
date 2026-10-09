import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import AppText from '@/src/components/common/AppText';
import BottomSheet from '@/src/components/common/BottomSheet';
import { ModuleColors, palette, size, space } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { LessonView } from '@/src/utils/learning';

const MAX_LIST_RATIO = 0.5;

type ModuleGuideSheetProps = {
  title: string;
  description: string | null;
  views: LessonView[];
  colors: ModuleColors;
  open: boolean;
  onRequestClose: () => void;
  onClosed: () => void;
};

// Guide du module : description et liste des leçons (terminée ou non)
export default function ModuleGuideSheet({
  title,
  description,
  views,
  colors,
  open,
  onRequestClose,
  onClosed,
}: ModuleGuideSheetProps) {
  const { colorScheme } = useTheme();
  const theme = palette[colorScheme];
  const { height } = useWindowDimensions();

  return (
    <BottomSheet open={open} onRequestClose={onRequestClose} onClosed={onClosed}>
      <View style={styles.content}>
        <AppText variant="sectionLabel">Guide du module</AppText>
        <AppText variant="title2" accessibilityRole="header">
          {title}
        </AppText>
        {description ? <AppText variant="body">{description}</AppText> : null}

        <ScrollView style={{ maxHeight: height * MAX_LIST_RATIO }} contentContainerStyle={styles.list}>
          {views.map((view) => {
            const done = view.status === 'completed';
            return (
              <View
                key={view.lesson.id}
                style={[styles.row, { borderBottomColor: theme.border }]}
                accessible
                accessibilityLabel={`Leçon ${view.number}, ${view.lesson.title}, ${done ? 'terminée' : 'à faire'}`}
              >
                <Ionicons
                  name={done ? 'checkmark-circle' : 'ellipse-outline'}
                  size={size.icon}
                  color={done ? colors.face : theme.textFaint}
                />
                <AppText variant="bodyMedium" style={styles.rowTitle}>
                  {`${view.number}. ${view.lesson.title}`}
                </AppText>
                <AppText variant="caption" tone="subtitle">
                  {done ? 'Terminée' : 'À faire'}
                </AppText>
              </View>
            );
          })}
        </ScrollView>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    marginTop: space[6],
    gap: space[2],
  },
  list: {
    marginTop: space[2],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    minHeight: size.rowMin,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowTitle: {
    flex: 1,
  },
});
