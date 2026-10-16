import { Pressable, StyleSheet, View } from 'react-native';

import AppText from '@/src/components/common/AppText';
import { fonts, palette, radius, space } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { select } from '@/src/utils/haptics';

type Props<K extends string> = {
  options: readonly { key: K; label: string; disabled?: boolean }[];
  value: K;
  onChange: (key: K) => void;
  // Les onglets prennent toute la largeur (sinon, au plus juste)
  fill?: boolean;
  activeColor?: string;
};

// Onglets en pilule (Valeur / Plus-value / Performance, Achat / Vente,
// Par type / Par risque / Par zone), sur le modèle des onglets de niveau.
export default function Segmented<K extends string>({ options, value, onChange, fill, activeColor }: Props<K>) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  return (
    <View style={[styles.frame, { backgroundColor: colors.panelStrong }, fill ? styles.fill : styles.fit]} accessibilityRole="tablist">
      {options.map((o) => {
        const active = o.key === value;
        return (
          <Pressable
            key={o.key}
            disabled={o.disabled}
            onPress={() => {
              if (active) return;
              select();
              onChange(o.key);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: active, disabled: o.disabled }}
            accessibilityLabel={o.label}
            style={({ pressed }) => [
              styles.tab,
              fill && styles.tabFill,
              active && { backgroundColor: colors.surfaceAlt },
              pressed && !active && { backgroundColor: colors.surface2 },
            ]}
          >
            <AppText
              maxFontSizeMultiplier={1.3}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
              style={[styles.label, { color: active ? (activeColor ?? colors.text) : o.disabled ? colors.textFaint : colors.subtitle }]}
            >
              {o.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    flexDirection: 'row',
    gap: space[1],
    padding: 3,
    borderRadius: radius.md,
    borderCurve: 'continuous',
  },
  fit: { alignSelf: 'flex-start' },
  fill: { alignSelf: 'stretch' },
  tab: {
    minHeight: 34,
    paddingHorizontal: space[2],
    borderRadius: 9,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabFill: { flex: 1 },
  label: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
  },
});
