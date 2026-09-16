import { Pressable, Text } from 'react-native';
import { Choice } from './types';

export default function ChoiceButton({
  choice,
  isSelected,
  isCorrectChoice,
  showResult,
  onPress,
  colors,
}: {
  choice: Choice;
  isSelected: boolean;
  isCorrectChoice?: boolean; // undefined = pas de notion de bon/mauvais
  showResult: boolean;
  onPress: () => void;
  colors: any;
}) {
  let backgroundColor = colors.surface;
  let borderColor = colors.border;

  if (showResult && isSelected) {
    if (isCorrectChoice === true) {
      backgroundColor = colors.success + '22';
      borderColor = colors.success;
    } else if (isCorrectChoice === false) {
      backgroundColor = colors.error + '22';
      borderColor = colors.error;
    } else {
      backgroundColor = colors.primary + '22';
      borderColor = colors.primary;
    }
  } else if (isSelected) {
    backgroundColor = colors.primary + '22';
    borderColor = colors.primary;
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={showResult}
      style={{
        borderWidth: 1.5,
        borderColor,
        backgroundColor,
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 16,
        marginBottom: 10,
      }}
    >
      <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>{choice.text}</Text>
    </Pressable>
  );
}