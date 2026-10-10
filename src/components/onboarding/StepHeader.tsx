import { StyleSheet, View } from 'react-native';

import { BackButton } from '@/src/components/apprendre/module/ModuleHeader';
import AppText from '@/src/components/common/AppText';
import { palette, radius, size, space } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';

const SEGMENT_H = 8;

type StepHeaderProps = {
  onBack?: () => void;
  // Barre en segments : étape `step` (à partir de 1) sur `total`
  step?: number;
  total?: number;
};

// Haut des écrans du parcours : retour, puis la progression de l'inscription
export default function StepHeader({ onBack, step, total }: StepHeaderProps) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const showProgress = step !== undefined && total !== undefined;

  return (
    <View style={styles.row}>
      {onBack ? <BackButton onBack={onBack} /> : <View style={styles.spacer} />}
      {showProgress ? (
        <>
          <View
            style={styles.segments}
            accessible
            accessibilityRole="progressbar"
            accessibilityLabel={`Étape ${step} sur ${total}`}
          >
            {Array.from({ length: total }, (_, i) => (
              <View key={i} style={[styles.segment, { backgroundColor: i < step ? colors.gold : colors.surface }]} />
            ))}
          </View>
          <AppText variant="caption" tone="subtitle" style={styles.count} importantForAccessibility="no">
            {`${step}/${total}`}
          </AppText>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    minHeight: size.tapMin,
  },
  spacer: {
    width: size.tapMin - space[3],
  },
  segments: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
  },
  segment: {
    flex: 1,
    height: SEGMENT_H,
    borderRadius: radius.pill,
  },
  count: {
    minWidth: 30,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
});
