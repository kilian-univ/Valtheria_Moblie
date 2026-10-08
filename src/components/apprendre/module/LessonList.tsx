import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import ListRow from '@/src/components/common/ListRow';
import { palette, size, space } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { formatXp } from '@/src/utils/format';
import { LessonView } from '@/src/utils/learning';

type LessonListProps = {
  views: LessonView[];
  onOpen: (view: LessonView) => void;
};

// Variante du chemin pour un texte très agrandi : une simple liste verticale,
// où les titres peuvent occuper toute la largeur.
export default function LessonList({ views, onOpen }: LessonListProps) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];

  return (
    <View style={styles.rows}>
      {views.map((view, i) => {
        const last = i === views.length - 1;
        const title = `${view.number}. ${view.lesson.title}`;

        if (view.status === 'locked') {
          return (
            <ListRow
              key={view.lesson.id}
              title={title}
              locked
              lockedReason={
                view.isFirstLocked && view.previousTitle ? `Après ${view.previousTitle}` : 'Disponible plus tard'
              }
              leading={<Ionicons name="lock-closed" size={size.icon} color={colors.subtitle} />}
              last={last}
            />
          );
        }

        const current = view.status === 'current';
        return (
          <ListRow
            key={view.lesson.id}
            title={title}
            subtitle={current ? `En cours, ${formatXp(view.lesson.xp_reward)}` : 'Terminée'}
            leading={
              <Ionicons
                name={current ? 'play-circle' : 'checkmark-circle'}
                size={size.icon}
                color={colors.gold}
              />
            }
            showChevron
            last={last}
            onPress={() => onOpen(view)}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  rows: {
    marginHorizontal: -space[4],
  },
});
