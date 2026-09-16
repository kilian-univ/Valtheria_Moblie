import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getBasiquesStyles, getBoutonStyles, palette } from '../constants/style/Style';
import { useTheme } from '../context/ThemeContext';

import Header from '../components/topbar/header';

export default function IndexScreen() {
  const { colorScheme, toggleTheme } = useTheme();
  const colors = palette[colorScheme];
  const basiques_styles = getBasiquesStyles(colorScheme);
  const bouton_styles = getBoutonStyles(colorScheme);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['bottom']}>
    <Header/>
    <View style={basiques_styles.container}>
      <Text style={basiques_styles.title}>Richesse</Text>
      <Text style={basiques_styles.subtitle}>
        Apprends à investir, un jour à la fois.

      </Text>

      <View style={basiques_styles.form}>
        
        <Pressable
          style={({ pressed }) => [
            bouton_styles.button,
            pressed && bouton_styles.buttonPressed,
          ]}
          onPress={toggleTheme}
        >
          <Text style={bouton_styles.buttonText}>
            Passer en mode {colorScheme === 'dark' ? 'clair' : 'sombre'}
          </Text>
        </Pressable>
      </View>
    </View>
    </SafeAreaView>
  );
}