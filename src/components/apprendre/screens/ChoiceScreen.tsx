import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { space } from '@/src/constants/style/Style';
import { select } from '@/src/utils/haptics';
import { isExactSelection } from '@/src/utils/lessonPlayer';
import ReliefOption, { OptionState } from '../player/ReliefOption';
import ScreenIntro from '../player/ScreenIntro';
import { LessonScreenProps } from '../types';

// choice — QCM à réponse unique (single) ou multiple (multiple). Noté.
export default function ChoiceScreen({ screen, answered, onDraftChange }: LessonScreenProps) {
  const { payload } = screen;
  const options: any[] = payload.options ?? [];
  const isMultiple = payload.mode === 'multiple';
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const correctOptions = options.filter((o) => o.correct);
  const correctIds: string[] = correctOptions.map((o) => o.id);

  // La réponse en cours remonte au lecteur (bouton Valider, feuille)
  useEffect(() => {
    if (selectedIds.length === 0) {
      onDraftChange(null);
      return;
    }
    onDraftChange({
      raw: isMultiple ? selectedIds : selectedIds[0],
      correct: isExactSelection(selectedIds, correctIds),
      correctText: correctOptions.map((o) => o.text).join(', ') || null,
    });
    // correctIds / correctOptions dérivent du payload, fixe pour cet écran
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIds, isMultiple, onDraftChange]);

  const toggle = (optionId: string) => {
    if (answered) return;
    select();
    if (isMultiple) {
      setSelectedIds((prev) => (prev.includes(optionId) ? prev.filter((id) => id !== optionId) : [...prev, optionId]));
    } else {
      setSelectedIds([optionId]);
    }
  };

  const stateOf = (option: any): OptionState => {
    const isSelected = selectedIds.includes(option.id);
    if (answered) {
      if (option.correct) return 'correct';
      if (isSelected) return 'wrong';
      return 'idle';
    }
    return isSelected ? 'selected' : 'idle';
  };

  return (
    <View style={styles.wrap}>
      <ScreenIntro
        screen={screen}
        question={payload.question}
        subtitle={payload.subtitle}
        hint={isMultiple ? 'Plusieurs réponses possibles' : undefined}
      />

      <View style={styles.options} accessibilityRole={isMultiple ? undefined : 'radiogroup'}>
        {options.map((option) => (
          <ReliefOption
            key={option.id}
            label={option.text}
            state={stateOf(option)}
            selected={selectedIds.includes(option.id)}
            multiple={isMultiple}
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
