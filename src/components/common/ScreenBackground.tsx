import { Dimensions, View } from 'react-native';

import { getBackgroundStyles } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';

const { width, height } = Dimensions.get('window');

// Fond commun à tous les écrans : quelques grandes taches floues (noir/blanc
// selon le thème), à très faible opacité, pour casser l'aplat sans dessiner
// un motif reconnaissable. À poser comme conteneur racine de chaque écran.
export default function ScreenBackground({ children }: { children: React.ReactNode }) {
  const { colorScheme } = useTheme();
  const styles = getBackgroundStyles(colorScheme);

  return (
    <View style={styles.container}>
      {/* Tache claire, coin haut-gauche */}
      <View
        pointerEvents="none"
        style={[
          styles.blobLight,
          { width: width * 0.9, height: width * 0.9, top: -width * 0.4, left: -width * 0.3 },
        ]}
      />
      {/* Tache sombre, milieu-droite */}
      <View
        pointerEvents="none"
        style={[
          styles.blobDark,
          { width: width * 1.1, height: width * 1.1, top: height * 0.25, right: -width * 0.5 },
        ]}
      />
      {/* Tache claire, bas-gauche */}
      <View
        pointerEvents="none"
        style={[
          styles.blobLight,
          { width: width * 0.8, height: width * 0.8, bottom: -width * 0.35, left: -width * 0.25 },
        ]}
      />

      {children}
    </View>
  );
}