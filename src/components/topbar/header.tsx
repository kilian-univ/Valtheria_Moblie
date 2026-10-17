import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import Text from '@/src/components/common/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getHeaderStyles, palette } from '../../constants/style/Style';
import { useApi } from '../../context/ApiContext';
import { useTheme } from '../../context/ThemeContext';
import Back from './Back';

type HeaderProps = {
  showBack?: boolean;
  hideAuthActions?: boolean;
};

export default function Header({ showBack = false, hideAuthActions = false }: HeaderProps) {
  const { colorScheme } = useTheme();
  const { isAuthenticated, isLoading } = useApi();
  const insets = useSafeAreaInsets();
  const header_styles = getHeaderStyles(colorScheme);
  const colors = palette[colorScheme];

  return (
    <View style={[header_styles.container, { paddingTop: insets.top }]}>
      <View style={header_styles.side}>
        {showBack && <Back style={header_styles.backBtn} />}
      </View>

      {/* Le temps de savoir si un token existe (lecture AsyncStorage), on
          n'affiche rien pour éviter un flash "Se connecter" → "Profil" */}
      {!isLoading && !hideAuthActions &&(
        <View style={header_styles.actions}>
          {isAuthenticated ? (
            <Pressable
              style={header_styles.iconBtn}
              onPress={() => router.push('/client/profil')}
            >
              <Ionicons name="person-circle-outline" size={26} color={colors.gold} />
            </Pressable>
          ) : (
            <>
              <Pressable
                style={header_styles.pillBtn}
                onPress={() => router.push('/client/login')}
              >
                <Text style={header_styles.pillBtnLabel}>Se connecter</Text>
              </Pressable>

              <Pressable
                style={header_styles.pillBtn}
                onPress={() => router.push('/client/register')}
              >
                <Text style={header_styles.pillBtnLabel}>S’inscrire</Text>
              </Pressable>
            </>
          )}
        </View>
      )}
    </View>
  );
}