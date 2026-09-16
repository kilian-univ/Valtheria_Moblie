import { ActivityIndicator, Pressable, Text } from 'react-native';

export default function ContinueButton({
  colors,
  onPress,
  label = 'Continuer',
  disabled,
  loading,
}: {
  colors: any;
  onPress: () => void;
  label?: string;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={{
        marginHorizontal: 20,
        marginTop: 24,
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: 'center',
        backgroundColor: disabled ? colors.surface : colors.primary,
        opacity: loading ? 0.7 : 1,
      }}
    >
      {loading ? (
        <ActivityIndicator color={colors.primaryText} size="small" />
      ) : (
        <Text style={{ color: disabled ? colors.subtitle : colors.primaryText, fontWeight: '700', fontSize: 15 }}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}