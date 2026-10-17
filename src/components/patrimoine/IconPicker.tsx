import { Pressable, StyleSheet, View } from 'react-native';

import AppText from '@/src/components/common/AppText';
import AssetIcon from '@/src/components/common/AssetIcon';
import { fonts, palette, space } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { select } from '@/src/utils/haptics';
import { ASSET_ICONS, iconDef, recognizeIcon, type IconKey } from '@/src/utils/patrimoine/assetIcons';
import type { AssetType } from '@/src/utils/patrimoine/model';

const SIZE = 40;

type Props = {
  // null : automatique (reconnue d'après le nom, sinon les initiales)
  value: IconKey | null;
  onChange: (icon: IconKey | null) => void;
  // Placement, pour l'aperçu de l'icône automatique
  name: string;
  ticker: string;
  type: AssetType;
};

// Choix de l'icône d'un placement sans cours (livret, bien estimé à la main) :
// « Auto » (reconnue d'après le nom, sinon les initiales), ou l'une des 14
export default function IconPicker({ value, onChange, name, ticker, type }: Props) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  // Icône que la reconnaissance donnerait (dite au lecteur d'écran)
  const auto = recognizeIcon({ ticker, name, type });
  const option = (key: IconKey | null, label: string) => {
    const selected = value === key;
    return (
      <Pressable
        key={key ?? 'auto'}
        onPress={() => {
          if (selected) return;
          select();
          onChange(key);
        }}
        accessibilityRole="radio"
        accessibilityState={{ checked: selected }}
        accessibilityLabel={label}
        hitSlop={2}
        style={({ pressed }) => [styles.option, { borderColor: selected ? colors.gold : 'transparent' }, pressed && { opacity: 0.7 }]}
      >
        {key ? (
          <AssetIcon logoUrl={null} name={name || '?'} ticker={ticker} type={type} icon={key} size={SIZE} />
        ) : (
          <View style={[styles.auto, { borderColor: colors.subtitle }]}>
            <AppText maxFontSizeMultiplier={1} style={[styles.autoText, { color: colors.subtitle }]}>
              Auto
            </AppText>
          </View>
        )}
      </Pressable>
    );
  };
  return (
    <View style={styles.field}>
      <AppText variant="caption" tone="subtitle">
        Icône
      </AppText>
      <View style={styles.grid} accessibilityRole="radiogroup" accessibilityLabel="Icône">
        {option(null, `Automatique, d’après le nom${auto ? ` : ${iconDef(auto).label}` : ''}`)}
        {ASSET_ICONS.map((i) => option(i.key, i.label))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space[1] },
  option: { padding: 2, borderRadius: SIZE, borderWidth: 2 },
  auto: { width: SIZE, height: SIZE, borderRadius: SIZE / 2, borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  autoText: { fontFamily: fonts.bodyBold, fontSize: 11 },
});
