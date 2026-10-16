import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import AppText from '@/src/components/common/AppText';
import { fonts, palette, withOpacity } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { initials } from '@/src/utils/patrimoine/format';
import type { AssetType } from '@/src/utils/patrimoine/model';

type Props = { logoUrl: string | null; name: string; ticker: string; type: AssetType; size?: number };

// Logo d'un actif (servi par le site), sinon une pastille à initiales dans la
// couleur de son type. Décoratif : le nom est lu par la ligne qui l'entoure.
export default function AssetLogo({ logoUrl, name, ticker, type, size = 40 }: Props) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const [failed, setFailed] = useState(false);
  const tint = {
    crypto: colors.chart4,
    action: colors.chart3,
    etf: colors.chart3,
    livret: colors.gold,
    matiere: colors.chart5,
    autre: colors.chart2,
  }[type];

  const box = { width: size, height: size, borderRadius: size / 2 };
  if (logoUrl && !failed) {
    return (
      <View style={[styles.logoBox, box, { backgroundColor: colors.surfaceAlt }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Image source={{ uri: logoUrl }} style={box} onError={() => setFailed(true)} resizeMode="contain" />
      </View>
    );
  }
  return (
    <View
      style={[styles.logoBox, box, { backgroundColor: withOpacity(tint, 0.18), borderColor: withOpacity(tint, 0.45) }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <AppText maxFontSizeMultiplier={1} style={[styles.initials, { color: tint, fontSize: Math.round(size * 0.34) }]}>
        {initials(name, type === 'autre' || type === 'livret' ? '' : ticker)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  logoBox: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
  },
  initials: {
    fontFamily: fonts.bodyExtraBold,
  },
});
