import { Text } from "expo-router/react-navigation";
import { Pressable } from "react-native";
export function Filter({
  label,
  isActive,
  onPress,
  colors,
}: {
  label: string;
  isActive: boolean;
  onPress: () => void;
  colors: any;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 14,
        paddingVertical: 7,
        marginRight: 8,
        borderRadius: 16,
        minHeight: 36,
        backgroundColor: isActive ? colors.primary : colors.surface,
        borderWidth: 1,
        borderColor: isActive ? colors.primary : colors.border,
      }}
    >
      <Text
        numberOfLines={1}
        style={{
          fontSize: 14,
          fontWeight: '600',
          lineHeight: 18,
          color: isActive ? colors.primaryText : colors.text,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}