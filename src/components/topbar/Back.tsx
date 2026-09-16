import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { TouchableOpacity } from "react-native";

type BackProps = {
  style?: any;
};

export default function Back({ style }: BackProps) {
  const router = useRouter();

  return (
    <TouchableOpacity onPress={() => router.back()} style={style}>
      <Ionicons name="chevron-back" size={28} color='#E8B23D' />
    </TouchableOpacity>
  );
}