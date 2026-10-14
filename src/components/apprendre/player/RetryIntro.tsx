import { StyleSheet, View } from 'react-native';

import AppText from '@/src/components/common/AppText';
import Button from '@/src/components/common/Button';
import Pill from '@/src/components/common/Pill';
import { ValPicture } from '@/src/components/common/ValBubble';
import { fonts, palette, space, titleLetterSpacing } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { catchUpText } from '@/src/utils/lessonPlayer';
import Cascade from './Cascade';

const VAL_SIZE = 170;
const TITLE_SIZE = 30;

type RetryIntroProps = {
  // Type de chaque question ratée, dans l'ordre où elles reviennent
  labels: string[];
  onStart: () => void;
  onSkip: () => void;
  // « Passer » envoie la leçon (vraie leçon) : envoi en cours, ou échoué
  loading?: boolean;
  errorText?: string | null;
};

// Avant la fin de leçon, s'il y a eu des erreurs : Val rassurant, le nombre
// de questions à rattraper et leur type, « C'est parti » ou « Passer ».
export default function RetryIntro({ labels, onStart, onSkip, loading, errorText }: RetryIntroProps) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];

  return (
    <View style={styles.wrap}>
      <View style={styles.center}>
        <Cascade index={0}>
          <View style={styles.val} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <ValPicture mood="rassurant" frame="xl" style={styles.valImage} />
          </View>
        </Cascade>
        <Cascade index={1} style={styles.texts}>
          <AppText accessibilityRole="header" maxFontSizeMultiplier={1.3} style={styles.title}>
            {'On revoit ce qui a coincé\u00A0?'}
          </AppText>
          <AppText variant="body" tone="subtitle" style={styles.centerText}>
            {catchUpText(labels.length)}
          </AppText>
        </Cascade>
        <Cascade index={2} style={styles.pills}>
          {labels.map((label, i) => (
            <Pill key={`${label}${i}`} size="md" label={label} icon="refresh" background={colors.dangerSoft} color={colors.error} />
          ))}
        </Cascade>
      </View>

      <View style={styles.footer}>
        {errorText ? (
          <AppText variant="callout" tone="error" accessibilityRole="alert" style={styles.centerText}>
            {errorText}
          </AppText>
        ) : null}
        <Button label="C’est parti" onPress={onStart} disabled={loading} />
        <Button variant="text" label={errorText ? 'Réessayer sans rattraper' : 'Passer'} onPress={onSkip} loading={loading} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    paddingHorizontal: space[5],
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: space[5],
  },
  val: {
    width: VAL_SIZE,
    height: VAL_SIZE,
  },
  valImage: {
    width: VAL_SIZE,
    height: VAL_SIZE,
  },
  texts: {
    alignItems: 'center',
    gap: space[2] + 2,
  },
  title: {
    fontFamily: fonts.title,
    fontSize: TITLE_SIZE,
    lineHeight: TITLE_SIZE + 6,
    letterSpacing: titleLetterSpacing(TITLE_SIZE),
    textAlign: 'center',
  },
  centerText: {
    textAlign: 'center',
  },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: space[2],
  },
  footer: {
    gap: space[1],
    paddingTop: space[3],
    paddingBottom: space[3],
  },
});
