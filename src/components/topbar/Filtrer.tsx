import { Text } from "expo-router/react-navigation";
import { Pressable } from "react-native";

import { fonts } from "@/src/constants/style/Style";

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
        backgroundColor: isActive ? colors.gold : colors.surface,
        borderWidth: 1,
        borderColor: isActive ? colors.gold : colors.controlBorder,
      }}
    >
      <Text
        numberOfLines={1}
        style={{
          fontSize: 14,
          fontFamily: fonts.bodySemibold,
          lineHeight: 18,
          color: isActive ? colors.onGold : colors.text,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}