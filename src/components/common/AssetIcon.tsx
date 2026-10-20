import { useState } from 'react';
import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import AppText from '@/src/components/common/AppText';
import { fonts, palette, withOpacity } from '@/src/constants/style/Style';
import { useApi } from '@/src/context/ApiContext';
import { useTheme } from '@/src/context/ThemeContext';
import { usePatrimoinePrefs } from '@/src/state/patrimoinePrefs';
import { userKeyOf } from '@/src/state/userMemory';
import { FAMILY_COLORS, ICON_DISC, iconDef, recognizeIcon, shapeFill, SYMBOL_STROKE, type IconKey } from '@/src/utils/patrimoine/assetIcons';
import { initials } from '@/src/utils/patrimoine/format';
import type { AssetType } from '@/src/utils/patrimoine/model';

type Props = {
  logoUrl: string | null;
  name: string;
  ticker: string;
  type: AssetType;
  size?: number;
  // Icône imposée (choix d'icône dans un formulaire) : passe avant tout le
  // reste ; null : sans tenir compte de l'icône choisie (aperçu « automatique »)
  icon?: IconKey | null;
};

// Icône d'un actif, partout où il s'affiche : l'icône choisie pour ce
// placement, sinon le logo servi par le site, sinon l'icône reconnue d'après
// le nom ou le symbole (placements sans cours), sinon une pastille à initiales
// dans la couleur de son type. Décorative : le nom est lu par la ligne qui
// l'entoure.
export default function AssetIcon({ logoUrl, name, ticker, type, size = 40, icon }: Props) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const { user } = useApi();
  const prefs = usePatrimoinePrefs(userKeyOf(user?.id));
  const [failed, setFailed] = useState(false);

  const chosen = icon !== undefined ? icon : (prefs?.icons[ticker.toUpperCase()] ?? null);
  const box = { width: size, height: size, borderRadius: size / 2 };

  if (chosen) return <IconDisc icon={chosen} size={size} />;
  if (logoUrl && !failed) {
    return (
      <View style={[styles.logoBox, box, { backgroundColor: colors.surfaceAlt }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Image source={{ uri: logoUrl }} style={box} onError={() => setFailed(true)} contentFit="contain" cachePolicy="memory-disk" />
      </View>
    );
  }
  const recognized = recognizeIcon({ ticker, name, type });
  if (recognized) return <IconDisc icon={recognized} size={size} />;

  const tint = {
    crypto: colors.chart4,
    action: colors.chart3,
    etf: colors.chart3,
    livret: colors.gold,
    matiere: colors.chart5,
    autre: colors.chart2,
  }[type];
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

// Rond sombre, liseré de 2 px de la couleur de la famille, symbole au centre
export function IconDisc({ icon, size }: { icon: IconKey; size: number }) {
  const def = iconDef(icon);
  const color = FAMILY_COLORS[def.family];
  // Liseré de 2 px à l'écran, quelle que soit la taille
  const ring = (2 * 40) / size;
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={size} height={size} viewBox="0 0 40 40">
        <Circle cx={20} cy={20} r={20 - ring / 2} fill={ICON_DISC} stroke={color} strokeWidth={ring} />
        {def.shapes.map((s, i) => {
          const paint = {
            stroke: color,
            strokeWidth: SYMBOL_STROKE,
            strokeLinecap: 'round' as const,
            strokeLinejoin: 'round' as const,
            fill: shapeFill(s.fill, color),
          };
          if (s.kind === 'circle') return <Circle key={i} cx={s.cx} cy={s.cy} r={s.r} {...paint} />;
          if (s.kind === 'rect') return <Rect key={i} x={s.x} y={s.y} width={s.w} height={s.h} rx={s.rx ?? 0} {...paint} />;
          return <Path key={i} d={s.d} {...paint} />;
        })}
      </Svg>
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
