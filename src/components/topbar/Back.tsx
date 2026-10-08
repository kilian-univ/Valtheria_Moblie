import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { TouchableOpacity } from "react-native";

import { palette } from "@/src/constants/style/Style";
import { useTheme } from "@/src/context/ThemeContext";

type BackProps = {
  style?: any;
};

export default function Back({ style }: BackProps) {
  const router = useRouter();
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];

  return (
    <TouchableOpacity onPress={() => router.back()} style={style}>
      <Ionicons name="chevron-back" size={28} color={colors.gold} />
    </TouchableOpacity>
  );
}