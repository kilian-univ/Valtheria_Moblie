import { Ionicons } from '@expo/vector-icons';
import { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import AppText from '@/src/components/common/AppText';
import { fonts, palette, radius, space } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import type { LevelGroup } from '@/src/utils/levels';

const TAB_HEIGHT = 38;
// Au-delà de trois niveaux, les onglets défilent au lieu de se serrer
const FIT_MAX = 3;

type LevelTabsProps = {
  groups: LevelGroup[];
  selected: number;
  onSelect: (index: number) => void;
};

// Sélecteur de niveaux en pilule : autant d'onglets que de niveaux, dans
// leur ordre. Terminé : coche ; verrouillé : cadenas (le toucher explique
// comment le débloquer, sans l'ouvrir).
export default function LevelTabs({ groups, selected, onSelect }: LevelTabsProps) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const fit = groups.length <= FIT_MAX;

  const tabs = groups.map((g, i) => {
    const active = i === selected;
    const tint = active ? colors.gold : colors.subtitle;
    return (
      <Pressable
        key={g.key ?? i}
        onPress={() => onSelect(i)}
        accessibilityRole="tab"
        accessibilityState={{ selected: active, disabled: !g.unlocked }}
        accessibilityLabel={`${g.label}${g.completed ? ', terminé' : !g.unlocked ? ', verrouillé' : ''}`}
        style={({ pressed }) => [
          styles.tab,
          fit ? styles.fitTab : styles.scrollTab,
          active && { backgroundColor: colors.surfaceAlt },
          pressed && !active && { backgroundColor: colors.surface2 },
        ]}
      >
        {g.completed ? (
          <Ionicons name="checkmark" size={13} color={colors.gold} />
        ) : !g.unlocked ? (
          <Ionicons name="lock-closed-outline" size={12} color={colors.subtitle} />
        ) : null}
        <AppText
          maxFontSizeMultiplier={1.3}
          numberOfLines={1}
          style={[styles.label, { color: tint }, active && styles.activeLabel]}
        >
          {g.label}
        </AppText>
      </Pressable>
    );
  });

  const frame = (children: ReactNode) => (
    <View style={[styles.frame, { backgroundColor: colors.panelStrong }]} accessibilityRole="tablist">
      {children}
    </View>
  );

  return fit ? (
    frame(tabs)
  ) : (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      {frame(tabs)}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  frame: {
    flexDirection: 'row',
    gap: 6,
    padding: space[1],
    borderRadius: radius.option,
    borderCurve: 'continuous',
    flexGrow: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  tab: {
    height: TAB_HEIGHT,
    borderRadius: 10,
    borderCurve: 'continuous',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  fitTab: {
    flex: 1,
    paddingHorizontal: space[1],
  },
  scrollTab: {
    paddingHorizontal: space[3] + 2,
  },
  label: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    lineHeight: 18,
  },
  activeLabel: {
    fontFamily: fonts.bodyExtraBold,
  },
});
