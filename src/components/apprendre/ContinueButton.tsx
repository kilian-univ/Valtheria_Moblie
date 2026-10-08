import { ActivityIndicator, Pressable, Text } from 'react-native';

import { fonts } from '@/src/constants/style/Style';

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
        borderRadius: 12,
        alignItems: 'center',
        backgroundColor: colors.gold,
        // Inactif = opacité 0.42 ; le chargement n'est pas un état inactif
        opacity: disabled && !loading ? 0.42 : 1,
      }}
    >
      {loading ? (
        <ActivityIndicator color={colors.onGold} size="small" />
      ) : (
        <Text style={{ color: colors.onGold, fontFamily: fonts.bodySemibold, fontSize: 15 }}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}