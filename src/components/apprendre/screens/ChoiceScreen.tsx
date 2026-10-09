import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { space } from '@/src/constants/style/Style';
import type { ChoiceScreen as ChoiceModel } from '@/src/lesson/model';
import { grade } from '@/src/utils/grade';
import { select } from '@/src/utils/haptics';
import ReliefOption, { OptionState } from '../player/ReliefOption';
import ScreenIntro from '../player/ScreenIntro';
import { LessonScreenProps } from '../types';

// choice — QCM à réponse unique (single) ou multiple (multiple). Noté.
// Réponse envoyée : l'id choisi, ou la liste des ids en mode multiple.
export default function ChoiceScreen({ screen, answered, onDraftChange }: LessonScreenProps<ChoiceModel>) {
  const { options, multiple } = screen;
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // La réponse en cours remonte au lecteur (bouton Valider, feuille)
  useEffect(() => {
    if (selectedIds.length === 0) {
      onDraftChange(null);
      return;
    }
    const raw = multiple ? selectedIds : selectedIds[0];
    onDraftChange({
      raw,
      correct: grade(screen.source, raw) === true,
      correctText:
        options
          .filter((o) => o.correct)
          .map((o) => o.text)
          .join(', ') || null,
    });
  }, [selectedIds, multiple, options, screen.source, onDraftChange]);

  const toggle = (optionId: string) => {
    if (answered) return;
    select();
    if (multiple) {
      setSelectedIds((prev) => (prev.includes(optionId) ? prev.filter((id) => id !== optionId) : [...prev, optionId]));
    } else {
      setSelectedIds([optionId]);
    }
  };

  const stateOf = (optionId: string, correct: boolean): OptionState => {
    const isSelected = selectedIds.includes(optionId);
    if (answered) {
      if (correct) return 'correct';
      if (isSelected) return 'wrong';
      return 'idle';
    }
    return isSelected ? 'selected' : 'idle';
  };

  return (
    <View style={styles.wrap}>
      <ScreenIntro screen={screen} hint={multiple ? 'Plusieurs réponses possibles' : undefined} />

      <View style={styles.options} accessibilityRole={multiple ? undefined : 'radiogroup'}>
        {options.map((option) => (
          <ReliefOption
            key={option.id}
            label={option.text}
            state={stateOf(option.id, option.correct)}
            selected={selectedIds.includes(option.id)}
            multiple={multiple}
            disabled={answered}
            onPress={() => toggle(option.id)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: space[6],
  },
  options: {
    gap: space[3],
  },
});
