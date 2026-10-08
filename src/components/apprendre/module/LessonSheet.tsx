import { StyleSheet, View } from 'react-native';

import AppText from '@/src/components/common/AppText';
import BottomSheet from '@/src/components/common/BottomSheet';
import Button from '@/src/components/common/Button';
import { size, space } from '@/src/constants/style/Style';
import { formatXp } from '@/src/utils/format';
import { LessonView } from '@/src/utils/learning';

type LessonSheetProps = {
  view: LessonView;
  open: boolean;
  onRequestClose: () => void;
  onClosed: () => void;
  onStart: (view: LessonView) => void;
  startDisabled: boolean;
  startDisabledReason?: string;
};

// Feuille d'une leçon terminée ou en cours
export default function LessonSheet({
  view,
  open,
  onRequestClose,
  onClosed,
  onStart,
  startDisabled,
  startDisabledReason,
}: LessonSheetProps) {
  const description = typeof view.lesson.description === 'string' ? view.lesson.description.trim() : '';

  return (
    <BottomSheet open={open} onRequestClose={onRequestClose} onClosed={onClosed}>
      <View style={styles.content}>
        <AppText variant="sectionLabel">{`Leçon ${view.number} sur ${view.total}`}</AppText>
        <AppText variant="title2" accessibilityRole="header">
          {view.lesson.title}
        </AppText>
        {/* Pas de description : aucun paragraphe, aucun espace vide */}
        {description ? <AppText variant="body">{description}</AppText> : null}
        <AppText variant="callout" tone="subtitle">
          {`${formatXp(view.lesson.xp_reward)} à gagner`}
        </AppText>
      </View>

      <Button
        label="Commencer la leçon"
        onPress={() => onStart(view)}
        disabled={startDisabled}
        disabledReason={startDisabledReason}
        style={styles.button}
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    marginTop: space[6],
    gap: space[2],
    // Laisse la place au bouton fermer à droite du premier intitulé
    paddingRight: size.tapMin,
  },
  button: {
    marginTop: space[6],
  },
});
