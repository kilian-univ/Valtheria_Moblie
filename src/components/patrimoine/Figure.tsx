import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import AppText from '@/src/components/common/AppText';
import { fonts, palette, radius, space } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import HelpTerm from './HelpTerm';

type Props = {
  label: string;
  value: string;
  // Montant lu par le lecteur d'écran (sinon la valeur affichée)
  spoken?: string;
  tone?: 'text' | 'success' | 'error' | 'gold';
  // Terme du Dictionnaire derrière le « ? »
  term?: string;
  big?: boolean;
  style?: StyleProp<ViewStyle>;
};

// Chiffre clé : petit libellé, valeur dessous (Fraunces si `big`)
export default function Figure({ label, value, spoken, tone = 'text', term, big, style }: Props) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const color = { text: colors.text, success: colors.success, error: colors.error, gold: colors.gold }[tone];
  return (
    <View style={[styles.tile, { backgroundColor: colors.panel }, style]}>
      <View style={styles.labelRow}>
        <AppText variant="caption" tone="subtitle" numberOfLines={2} style={styles.label} accessible accessibilityLabel={`${label} : ${spoken ?? value}`}>
          {label}
        </AppText>
        {term ? <HelpTerm term={term} /> : null}
      </View>
      <AppText
        maxFontSizeMultiplier={1.3}
        numberOfLines={1}
        adjustsFontSizeToFit
        accessibilityElementsHidden
        importantForAccessibility="no"
        style={[big ? styles.bigValue : styles.value, { color }]}
      >
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: space[3],
    borderRadius: radius.option,
    borderCurve: 'continuous',
    gap: 2,
  },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  label: { flexShrink: 1, fontSize: 12 },
  value: { fontFamily: fonts.bodyBold, fontSize: 15, fontVariant: ['tabular-nums'] },
  bigValue: { fontFamily: fonts.title, fontSize: 20, lineHeight: 26, fontVariant: ['tabular-nums'] },
});
