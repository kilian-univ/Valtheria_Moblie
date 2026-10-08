import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import AppText from '@/src/components/common/AppText';
import ProgressRing from '@/src/components/common/ProgressRing';
import { palette, size, space } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { lessonsWord } from '@/src/utils/learning';

const BACK_SIZE = 26;
const RING = 72;
const RING_STROKE = 6;
const RING_LABEL = 15;

type ModuleHeaderProps = {
  info: { title: string; done: number; total: number };
};

export function BackButton({ onBack }: { onBack: () => void }) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  return (
    <Pressable
      onPress={onBack}
      accessibilityRole="button"
      accessibilityLabel="Retour"
      style={({ pressed }) => [styles.back, pressed && { backgroundColor: colors.surface2 }]}
    >
      <Ionicons name="chevron-back" size={BACK_SIZE} color={colors.text} />
    </Pressable>
  );
}

// En-tête de la page module : titre et grand anneau de progression « X/Y »
// à droite. Le bouton retour (BackButton) est posé à part par l'écran : il
// reste affiché pendant le chargement.
export default function ModuleHeader({ info }: ModuleHeaderProps) {
  const progress = info.total === 0 ? 0 : info.done / info.total;

  return (
    <View style={styles.wrap}>
      <View style={styles.titleRow}>
        <View style={styles.titles}>
          <AppText variant="title1" accessibilityRole="header">
            {info.title}
          </AppText>
          <AppText variant="callout" tone="subtitle">
            {`${info.done} ${lessonsWord(info.done)} sur ${info.total} ${info.done >= 2 ? 'terminées' : 'terminée'}`}
          </AppText>
        </View>
        <ProgressRing
          diameter={RING}
          stroke={RING_STROKE}
          progress={progress}
          label={`${info.done}/${info.total}`}
          labelSize={RING_LABEL}
          accessibilityLabel={`Progression : ${info.done} sur ${info.total}`}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingBottom: space[4],
  },
  back: {
    width: size.tapMin,
    height: size.tapMin,
    borderRadius: size.tapMin / 2,
    alignItems: 'center',
    justifyContent: 'center',
    // Aligne optiquement le chevron sur la marge de 20
    marginLeft: -space[3],
  },
  titleRow: {
    marginTop: space[2],
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[4],
  },
  titles: {
    flex: 1,
    gap: space[1],
  },
});
