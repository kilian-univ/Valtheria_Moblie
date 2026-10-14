import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { StyleProp, StyleSheet, Switch, View, ViewStyle } from 'react-native';

import AppText from '@/src/components/common/AppText';
import { palette, radius, space } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { soundSettings, useSoundEnabled } from '@/src/state/soundSettings';
import { select } from '@/src/utils/haptics';
import { playSound } from '@/src/utils/sound';

// Réglage « Sons » partagé (profil, feuille « Quitter la leçon ? »,
// connexion) : une seule mémoire sur le téléphone (state/soundSettings.ts).
// Un cran de vibration au changement ; réactivés, un court son le confirme.
export function useSoundToggle(): { enabled: boolean; toggle: (next: boolean) => void } {
  const enabled = useSoundEnabled();

  useEffect(() => {
    soundSettings.load();
  }, []);

  const toggle = (next: boolean) => {
    select();
    soundSettings.set(next);
    if (next) playSound('select');
  };

  return { enabled, toggle };
}

type SoundToggleProps = {
  // card : ligne posée dans une carte (connexion) ; plain : sans fond
  // (sous les boutons d'une feuille)
  variant?: 'card' | 'plain';
  style?: StyleProp<ViewStyle>;
};

// Interrupteur « Sons » : haut-parleur, libellé, état (activés ou coupés)
export default function SoundToggle({ variant = 'plain', style }: SoundToggleProps) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const { enabled, toggle } = useSoundToggle();

  return (
    <View style={[styles.row, variant === 'card' && [styles.card, { backgroundColor: colors.surface }], style]}>
      <Ionicons name={enabled ? 'volume-medium-outline' : 'volume-mute-outline'} size={20} color={colors.subtitle} />
      <View style={styles.texts}>
        <AppText variant="bodyMedium">Sons</AppText>
        <AppText variant="caption" tone="subtitle">
          {enabled ? 'Activés' : 'Coupés'}
        </AppText>
      </View>
      <SoundSwitch enabled={enabled} onChange={toggle} />
    </View>
  );
}

// L'interrupteur lui-même, aux couleurs de l'app
export function SoundSwitch({ enabled, onChange }: { enabled: boolean; onChange: (next: boolean) => void }) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  return (
    <Switch
      value={enabled}
      onValueChange={onChange}
      trackColor={{ false: colors.surface2, true: colors.gold }}
      thumbColor={colors.ivory}
      ios_backgroundColor={colors.surface2}
      // Web : couleur du bouton quand l'interrupteur est activé
      {...({ activeThumbColor: colors.ivory } as object)}
      accessibilityLabel="Sons des leçons"
      accessibilityHint={enabled ? 'Touche pour couper les sons' : 'Touche pour activer les sons'}
    />
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    minHeight: 44,
  },
  card: {
    paddingHorizontal: space[4],
    paddingVertical: space[2],
    borderRadius: radius.card,
    borderCurve: 'continuous',
  },
  // Largeur donnée par la rangée (jamais flex: 1 seul)
  texts: {
    flexGrow: 1,
    flexShrink: 1,
  },
});
