import { Text, View } from 'react-native';
import { MaxLine, VISUAL_EMOJI } from './types';

export default function MaxBubble({ max, colors }: { max?: MaxLine; colors: any }) {
  if (!max?.line) return null;
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: 10,
        marginHorizontal: 20,
        marginBottom: 20,
        alignItems: 'flex-start',
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: 20 }}>{VISUAL_EMOJI[max.visual ?? 'neutre'] ?? '🙂'}</Text>
      </View>
      <View
        style={{
          flex: 1,
          backgroundColor: colors.surface,
          borderRadius: 14,
          borderTopLeftRadius: 4,
          paddingHorizontal: 14,
          paddingVertical: 10,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <Text style={{ color: colors.text, fontSize: 14, lineHeight: 20 }}>{max.line}</Text>
      </View>
    </View>
  );
}